import {
    callMainThread,
    calculateFileHash,
    log,
    initRPCListener,
    requestWithValidate
} from "./worker.utils"
import type {
    WorkerInitPayload,
    WorkerMessage,
    RequestOption,
    ChunkItem
} from "../types"
import { formatError } from "../utils"

// 1. 启动 RPC 监听
initRPCListener()

/**
 * Worker 主逻辑
 */
self.onmessage = async (e: MessageEvent<any>) => {
    // 只处理 init 任务，hook_result 由 initRPCListener 处理
    if (e.data.type !== "init") return

    const { file, uid, config } = e.data as WorkerInitPayload
    const {
        serverUrl,
        chunkSize = 5 * 1024 * 1024,
        concurrency = 3,
        token,
        checkEnabled,
        showLog = true,
        apiPaths
    } = config

    // 提取公共配置供 requestWithValidate 使用
    const reqConfig = { serverUrl, token }

    // 默认生成器
    const defaultGenerators = {
        check: (ctx: any) => ({
            url: `${serverUrl}${apiPaths?.check || "/upload_already"}?HASH=${
                ctx.hash
            }`,
            method: "GET"
        }),
        upload: (_ctx: any) => ({
            url: `${serverUrl}${apiPaths?.upload || "/upload_chunk"}`,
            method: "POST",
            body: null
        }), // Body 由 Worker 自动填充
        merge: (ctx: any) => ({
            url: `${serverUrl}${apiPaths?.merge || "/upload_merge"}`,
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                HASH: ctx.hash,
                count: String(ctx.count)
            })
        })
    }

    // 辅助：执行 Hook 步骤
    const executeStep = async <T>(
        hookName: any,
        defaultFn: (c: any) => T,
        localCtx: any
    ): Promise<T> => {
        // 剔除 Blob/File，只传轻量元数据给主线程
        const { chunk: _chunk, file: _file, ...rpcCtx } = localCtx

        // 发起 RPC (带上 UID)
        log(showLog, `[${uid}] Call Hook: ${hookName}`)
        const userResult = await callMainThread<T>(uid, hookName, rpcCtx)

        return userResult || defaultFn(localCtx)
    }

    try {
        // 1. 纯数学计算，瞬间完成
        const totalChunks = Math.ceil(file.size / chunkSize)

        // --- 2. Hash ---
        log(showLog, `[${uid}] Calculating Hash...`)
        const hash = await calculateFileHash(file)
        log(showLog, `[${uid}] Hash: ${hash}`)

        const suffix = file.name.split(".").pop() || "tmp"

        // --- 3. Init ---
        const initData = await callMainThread(uid, "init", {
            count: totalChunks,
            chunkSize: chunkSize,
            hash
        })

        // --- 4. 切片 ---
        const chunksList: ChunkItem[] = []
        for (let i = 0; i < totalChunks; i++) {
            chunksList.push({
                file: file.slice(
                    i * chunkSize,
                    Math.min((i + 1) * chunkSize, file.size)
                ),
                filename: `${hash}_${i + 1}.${suffix}`,
                index: i + 1
            })
        }

        // --- 5. Check ---
        let uploadedList: string[] = []
        if (checkEnabled) {
            try {
                const ctx = { hash, filename: file.name, initData }
                const opt = await executeStep<RequestOption>(
                    "check",
                    defaultGenerators.check,
                    ctx
                )

                const res = await requestWithValidate(
                    uid,
                    opt,
                    ctx,
                    "check",
                    reqConfig
                )

                if (res?.fileList) uploadedList = res.fileList
            } catch (e) {
                /* ignore */
                console.warn("Check failed", e)
                // 注意：通常 check 失败降级为全量上传，不需要阻断
            }
        }

        // --- 6. Upload (重点) ---
        const chunksToDo = chunksList.filter(
            c => !uploadedList.includes(c.filename)
        )

        if (chunksToDo.length === 0) {
            self.postMessage({
                type: "progress",
                uid,
                percent: 100
            } as WorkerMessage)
        } else {
            let finishedCount = uploadedList.length
            const pool = new Set<Promise<any>>()

            for (const chunkItem of chunksToDo) {
                const ctx = {
                    hash,
                    chunk: chunkItem.file,
                    filename: chunkItem.filename,
                    index: chunkItem.index,
                    count: totalChunks,
                    chunkSize,
                    initData
                }
                // A. 获取配置
                const opt = await executeStep<RequestOption>(
                    "upload",
                    defaultGenerators.upload,
                    ctx
                )

                // B. 【核心】自动组装 FormData
                // 这里的逻辑是：如果用户返回了 JSON body，我们就把它塞进 FormData，并把切片塞进去
                let finalBody: BodyInit | null = opt.body as BodyInit

                // 仅当 POST 且 body 不是 FormData 实例时，自动组装
                if (
                    (!opt.method || opt.method === "POST") &&
                    !(finalBody instanceof FormData)
                ) {
                    const fd = new FormData()
                    // 1. 塞入用户自定义字段
                    if (opt.body && typeof opt.body === "object") {
                        Object.entries(opt.body).forEach(([k, v]) =>
                            fd.append(k, v)
                        )
                    }
                    // 2. 塞入切片 (默认字段 'file')
                    fd.append(opt.chunkFieldName || "file", chunkItem.file)

                    // 3. 默认兜底
                    if (!opt.body) {
                        fd.append("filename", chunkItem.filename)
                        fd.append("hash", hash)
                    }
                    finalBody = fd
                }

                const task = requestWithValidate(
                    uid,
                    { ...opt, body: finalBody },
                    ctx,
                    "upload",
                    reqConfig
                ).then(() => {
                    finishedCount++
                    self.postMessage({
                        type: "progress",
                        uid,
                        percent: Number(
                            ((finishedCount / totalChunks) * 100).toFixed(2)
                        )
                    } as WorkerMessage)
                    pool.delete(task)
                })

                pool.add(task)
                if (pool.size >= concurrency) await Promise.race(pool)
            }
            await Promise.all(pool)
        }

        // --- 7. Merge ---
        const ctx = {
            hash,
            count: totalChunks,
            filename: file.name,
            initData
        }
        const mergeOpt = await executeStep<RequestOption>(
            "merge",
            defaultGenerators.merge,
            ctx
        )

        await requestWithValidate(uid, mergeOpt, ctx, "merge", reqConfig)

        self.postMessage({ type: "done", uid, hash } as WorkerMessage)
    } catch (error) {
        self.postMessage({
            type: "error",
            uid,
            error: formatError(error)
        } as WorkerMessage)
    }
}

export {}
