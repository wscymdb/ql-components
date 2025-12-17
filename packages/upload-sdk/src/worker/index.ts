import {
    callMainThread,
    calculateFileHash,
    log,
    initRPCListener,
    requestWithValidate,
    WorkerControlFlow
} from "./worker.utils"
import type { WorkerInitPayload, WorkerMessage, RequestOption, ChunkItem } from "../types"
import { formatError } from "../utils"

// 启动 RPC 监听
initRPCListener()

// 封装发送进度的函数
const sendHashProgress = (uid: string, percent: number) => {
    self.postMessage({ type: "hash_progress", uid, percent })
}

// 【新增】存储被取消的 UID
const cancelledUIDs = new Set<string>()

/**
 * Worker 主逻辑
 */
self.onmessage = async (e: MessageEvent<any>) => {
    // 处理取消指令
    if (e.data.type === "cancel") {
        const { uid } = e.data
        cancelledUIDs.add(uid) // 加入黑名单
        return
    }

    // 处理纯计算指令
    if (e.data.type === "only_hash") {
        try {
            const { file, uid } = e.data
            // 复用现有的计算逻辑
            const hash = await calculateFileHash(file, percent => {
                // 每次回调都检查一下是否被取消
                if (cancelledUIDs.has(uid)) {
                    throw new Error("TaskCanceled") // 抛错中断读取流
                }
                sendHashProgress(uid, percent)
            })
            self.postMessage({ type: "hash_result", hash })
        } catch (error) {
            // 【核心修复】捕获取消错误，静默退出
            if (error instanceof Error && error.message === "TaskCanceled") {
                return // 静默退出，不报错
            }

            self.postMessage({
                type: "error",
                error: formatError(error)
            })
        }
        return
    }

    // 只处理 init 任务，hook_result 由 initRPCListener 处理
    if (e.data.type !== "init") return

    const { file, uid, config } = e.data as WorkerInitPayload

    // 新任务开始时，确保把它从黑名单移除
    cancelledUIDs.delete(uid)

    const {
        serverUrl,
        chunkSize = 5 * 1024 * 1024,
        concurrency = 3,
        token,
        // checkEnabled,
        showLog = true,
        apiPaths
    } = config

    const checkEnabled = false // 暂时不支持秒传

    // 提取公共配置供 requestWithValidate 使用
    const reqConfig = { serverUrl, token }

    // 默认生成器
    const defaultGenerators = {
        check: (ctx: any) => ({
            url: `${serverUrl}${apiPaths?.check || "/upload_already"}?HASH=${ctx.hash}`,
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
    const executeStep = async <T>(hookName: any, defaultFn: (c: any) => T, localCtx: any): Promise<T> => {
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

        // --- 2. Hash --- （如果有预计算 Hash，直接使用；否则计算）
        let hash = config.hash

        if (!hash) {
            log(showLog, `[${uid}] Calculating Hash...`)
            hash = await calculateFileHash(file, percent => {
                // 如果是在主 Worker 里算 Hash，必须在这里手动检查取消状态
                if (cancelledUIDs.has(uid)) {
                    throw new Error("TaskCanceled") // 打断 calculateFileHash 内部的循环
                }
                sendHashProgress(uid, percent)
            })
        }

        // Hash算完检查一下是否取消
        if (cancelledUIDs.has(uid)) throw new Error("TaskCanceled")

        log(showLog, `[${uid}] Hash: ${hash}`)

        const suffix = file.name.split(".").pop() || "tmp"

        // --- 3. Init ---
        const initData = await callMainThread<any>(uid, "init", {
            count: totalChunks,
            chunkSize: chunkSize,
            hash
        })

        // Init完检查一下
        if (cancelledUIDs.has(uid)) throw new Error("TaskCanceled")

        // --- 4. 切片 ---
        const chunksList: ChunkItem[] = []
        for (let i = 0; i < totalChunks; i++) {
            chunksList.push({
                file: file.slice(i * chunkSize, Math.min((i + 1) * chunkSize, file.size)),
                filename: `${hash}_${i + 1}.${suffix}`,
                index: i + 1
            })
        }

        // --- 5. Check ---
        let uploadedList: string[] = []
        if (checkEnabled) {
            try {
                const ctx = { hash, filename: file.name, initData }
                const opt = await executeStep<RequestOption>("check", defaultGenerators.check, ctx)

                const res = await requestWithValidate(uid, opt, ctx, "check", reqConfig)

                if (res?.fileList) uploadedList = res.fileList
            } catch (e) {
                /* ignore */
                console.warn("Check failed", e)
                // 注意：通常 check 失败降级为全量上传，不需要阻断
            }
        }
        // 【新增检查】Check完检查一下
        if (cancelledUIDs.has(uid)) throw new Error("TaskCanceled")

        // --- 6. Upload (重点) ---
        const chunksToDo = chunksList.filter(c => !uploadedList.includes(c.filename))

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
                if (cancelledUIDs.has(uid)) {
                    throw new Error("TaskCanceled")
                }

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
                const opt = await executeStep<RequestOption>("upload", defaultGenerators.upload, ctx)

                // B. 【核心】自动组装 FormData
                // 这里的逻辑是：如果用户返回了 JSON body，我们就把它塞进 FormData，并把切片塞进去
                let finalBody: BodyInit | null = opt.body as BodyInit

                // 仅当 POST 且 body 不是 FormData 实例时，自动组装
                if ((!opt.method || opt.method === "POST") && !(finalBody instanceof FormData)) {
                    const fd = new FormData()
                    // 1. 塞入用户自定义字段
                    if (opt.body && typeof opt.body === "object") {
                        Object.entries(opt.body).forEach(([k, v]) => fd.append(k, v))
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

                const task = requestWithValidate(uid, { ...opt, body: finalBody }, ctx, "upload", reqConfig).then(
                    () => {
                        finishedCount++
                        self.postMessage({
                            type: "progress",
                            uid,
                            percent: Number(((finishedCount / totalChunks) * 100).toFixed(2))
                        } as WorkerMessage)
                        pool.delete(task)
                    }
                )

                pool.add(task)
                if (pool.size >= concurrency) await Promise.race(pool)
            }
            await Promise.all(pool)
        }

        // --- 7. Merge ---
        // 合并前最后检查一次
        if (cancelledUIDs.has(uid)) throw new Error("TaskCanceled")

        const ctx = {
            hash,
            count: totalChunks,
            filename: file.name,
            initData
        }
        const mergeOpt = await executeStep<RequestOption>("merge", defaultGenerators.merge, ctx)

        await requestWithValidate(uid, mergeOpt, ctx, "merge", reqConfig)

        self.postMessage({ type: "done", uid, hash } as WorkerMessage)
    } catch (error) {
        // 1. 统一捕获控制流
        if (error instanceof WorkerControlFlow) {
            // 场景 A: 秒传成功 (ctx.success)
            if (error.type === "success") {
                const data = error.payload
                log(showLog, `[${uid}] Task completed via ctx.success()`)
                // 补发 100%
                self.postMessage({ type: "progress", uid, percent: 100 } as WorkerMessage)
                // 发送 Done
                self.postMessage({ type: "done", uid, hash: (config as any).hash || "", data } as WorkerMessage)
            }

            // 场景 B: 业务拦截 (ctx.fail)
            else if (error.type === "fail") {
                const { message, code } = error.payload
                // 发送 Error (带上 code)
                self.postMessage({
                    type: "error",
                    uid,
                    error: message || "Task Failed",
                    code
                } as WorkerMessage)
            }

            return // 捕获处理完毕，退出
        }
        // 2. 处理取消 (静默退出)
        if (error instanceof Error && error.message === "TaskCanceled") {
            return // 静默退出，不报错
        }

        // 3. 处理普通代码错误 (格式化后发送)
        self.postMessage({
            type: "error",
            uid,
            error: formatError(error)
        } as WorkerMessage)
    }
}

export {}
