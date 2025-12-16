import type {
    GlobalUploadState,
    UploadConfig,
    UploadListener,
    WorkerMessage,
    WorkerInitPayload,
    RPCCallPayload,
    RPCResultPayload,
    HookContext,
    SingleFileState,
    UploadSuccessResult,
    UploadErrorResult
} from "@/types"

import workerCode from "../../worker/index?worker"
import { formatError } from "@/utils"

// 默认配置
const DEFAULT_CONFIG: UploadConfig = {
    serverUrl: "",
    chunkSize: 5 * 1024 * 1024,
    concurrency: 3,
    checkEnabled: true,
    preventWindowClose: true,
    showLog: false,
    apiPaths: {
        check: "/upload_already",
        upload: "/upload_chunk",
        merge: "/upload_merge"
    }
}

export class UploadManager {
    private static instance: UploadManager
    private worker: Worker | null = null
    private listeners: UploadListener[] = []
    private state: GlobalUploadState = {}
    private config: UploadConfig = { ...DEFAULT_CONFIG }

    // 【新增】存储临时 Hash Worker：UID -> Worker
    private tempWorkerMap: Map<string, Worker> = new Map()

    // 【新增】忽略名单：防止 Worker 的延迟消息覆盖掉主线程的“取消”状态
    private ignoringUIDs: Set<string> = new Set()

    // 【新增】存储正在进行 Hash 计算的 Promise：UID -> Promise
    // 作用：防止重复计算，让 startUpload 能“搭便车”
    private pendingHashTasks: Map<string, Promise<string>> = new Map()

    // 缓存生成的 Blob URL，避免每次 new Worker 都重新 createObjectURL
    private workerBlobUrl: string | null = null

    // 【核心】文件注册表：UID -> File
    // 用于在 RPC 调用时找回原始文件
    private fileRegistry: Map<string, File> = new Map()

    // Promise 句柄类型：resolve 的值改为 UploadSuccessResult
    // reject 的值改为 UploadErrorResult
    private promiseMap: Map<
        string,
        {
            resolve: (val: UploadSuccessResult) => void
            reject: (val: UploadErrorResult) => void
        }
    > = new Map()

    private constructor() {
        window.addEventListener("beforeunload", e => {
            if (!this.config.preventWindowClose) return
            const isUploading = Object.values(this.state).some(
                item => item.status === "uploading"
            )
            if (isUploading) e.preventDefault()
        })
    }

    /**
     * 统一生成 Worker 的 Blob URL
     */
    private getWorkerBlobUrl(): string {
        if (this.workerBlobUrl) return this.workerBlobUrl

        // 把字符串代码包装成 Blob 对象
        const blob = new Blob([workerCode], { type: "application/javascript" })

        //  生成一个临时的 URL (blob:http://...)
        this.workerBlobUrl = URL.createObjectURL(blob)
        return this.workerBlobUrl
    }

    private initWorker() {
        if (!this.worker) {
            this.worker = new Worker(this.getWorkerBlobUrl())

            this.worker.onmessage = async (e: MessageEvent<WorkerMessage>) => {
                const msg = e.data

                // 日志
                if (msg.type === "log") {
                    console.log("[Worker]", msg.message)
                    return
                }

                // 【核心修复】如果该 UID 在忽略名单里，直接丢弃这条消息
                // 解决“点两次才归零”的 Bug
                if ("uid" in msg && this.ignoringUIDs.has(msg.uid)) {
                    return
                }

                // 处理 RPC 请求 (Worker 想要执行 Hook)
                if (msg.type === "call_hook") {
                    await this.handleRPCCall(msg)
                    return
                }

                //  状态变更
                const { uid } = msg

                switch (msg.type) {
                    case "hash_progress":
                        this.updateFileState(uid, {
                            status: "calculating", // 确保状态正确
                            progress: msg.percent // 复用 progress 字段
                        })
                        break
                    case "progress":
                        this.updateFileState(uid, {
                            status: "uploading",
                            progress: msg.percent
                        })
                        break
                    case "done":
                        this.handleDone(uid, msg.hash)

                        break
                    case "error":
                        this.handleError(uid, msg.error)

                        console.error(`上传失败 [${uid}]:`, msg.error)
                        break
                }
            }
        }
        return this.worker
    }

    /**
     * 【新增】资源清理方法
     * 任务结束（成功/失败）后，释放对大文件对象的引用，允许垃圾回收
     */
    private cleanup(uid: string) {
        // 1. 从注册表中移除原始文件
        // 这样 RPC 就无法再访问该文件了，但任务已结束，本来就不需要访问了
        this.fileRegistry.delete(uid)

        // 2. 确保 Promise 句柄也被清理
        // (虽然 resolve/reject 后通常会手动 delete，这里作为兜底)
        this.promiseMap.delete(uid)

        // 注意：不要删除 this.state[uid]
        // 因为 UI 还需要展示 "Done" 状态和 100% 进度条
    }

    private handleDone(uid: string, hash: string) {
        // 获取当前任务的 Promise 句柄 和 原始文件
        const promiseHandler = this.promiseMap.get(uid)
        const originalFile = this.fileRegistry.get(uid)

        this.updateFileState(uid, { status: "done", progress: 100, hash })

        if (promiseHandler && originalFile) {
            promiseHandler.resolve({
                status: "success",
                uid,
                file: originalFile,
                hash
            })
            this.promiseMap.delete(uid)
        }
        this.cleanup(uid)
    }

    private handleError(uid: string, errorMsg: string) {
        const promiseHandler = this.promiseMap.get(uid)
        const originalFile = this.fileRegistry.get(uid)
        const errObj = new Error(errorMsg)

        this.updateFileState(uid, { status: "error", errorMsg })

        if (promiseHandler && originalFile) {
            promiseHandler.reject({
                status: "error",
                uid,
                file: originalFile,
                error: errObj
            })
            this.promiseMap.delete(uid)
        }
        console.error(`上传失败 [${uid}]:`, errorMsg)
        this.cleanup(uid)
    }

    /**
     * 处理 RPC 调用：查找配置 -> 注入 File -> 执行 -> 返回
     */
    private async handleRPCCall(payload: RPCCallPayload) {
        const { reqId, hookName, ctx, uid } = payload
        const reply: RPCResultPayload = {
            type: "hook_result",
            reqId,
            data: null
        }

        try {
            // 1. 获取全局配置的 Hook 函数
            const userHook = this.config.hooks?.[hookName]

            if (userHook && typeof userHook === "function") {
                // 2. 从注册表中找回 File
                const originalFile = this.fileRegistry.get(uid)

                // 3. 注入到 Context 中
                const fullCtx: HookContext = { ...ctx, file: originalFile }

                // 4. 执行 Hook (运行在主线程，可访问闭包)
                const result = await userHook(fullCtx)
                reply.data = result
            }
        } catch (error) {
            reply.error = formatError(error)
        }

        // 5. 返回结果给 Worker
        this.worker?.postMessage(reply)
    }

    private updateFileState(uid: string, payload: Partial<SingleFileState>) {
        const oldFileState = this.state[uid] || {
            uid,
            progress: 0,
            status: "idle"
        }
        this.state = { ...this.state, [uid]: { ...oldFileState, ...payload } }
        this.listeners.forEach(l => l(this.state))
    }

    // --- Public API ---

    static getInstance() {
        if (!UploadManager.instance)
            UploadManager.instance = new UploadManager()
        return UploadManager.instance
    }

    public getState() {
        return { ...this.state }
    }

    public setConfig(options: Partial<UploadConfig>) {
        this.config = {
            ...this.config,
            ...options,
            apiPaths: { ...this.config.apiPaths, ...options.apiPaths }
        }
    }

    public subscribe(listener: UploadListener) {
        this.listeners.push(listener)
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener)
        }
    }

    /**
     * 【新增】纯计算 Hash 方法 (Pre-calculate)
     * 使用独立的临时 Worker，不影响主流程
     */
    public async computeHash(file: any): Promise<string> {
        const rawFile = file.originFileObj || file
        const uid = rawFile.uid || `${Date.now()}`

        // 1. 如果已经算好了，直接返回
        const existing = this.state[uid]
        if (existing?.hash) return existing.hash

        // 如果正在计算，直接返回正在跑的 Promise (复用)
        if (this.pendingHashTasks.has(uid)) {
            return this.pendingHashTasks.get(uid)!
        }

        // 2. 更新状态为 calculating
        // 注意：这里我们只更新状态，不注册到 fileRegistry，因为这是纯计算任务
        this.updateFileState(uid, { uid, status: "calculating", progress: 0 })

        const task = new Promise<string>((resolve, reject) => {
            // 创建一个新的临时 Worker，用完即焚
            const tempWorker = new Worker(this.getWorkerBlobUrl())

            // 存入 Map
            this.tempWorkerMap.set(uid, tempWorker)

            tempWorker.onmessage = e => {
                const msg = e.data

                // 这里也做同样的类型收窄
                if (msg.type === "log") return

                switch (msg.type) {
                    case "hash_progress":
                        // 【关键】收到进度，更新状态
                        this.updateFileState(uid, {
                            status: "calculating",
                            progress: msg.percent
                        })
                        break

                    case "hash_result":
                        this.updateFileState(uid, {
                            status: "idle",
                            hash: msg.hash,
                            progress: 100
                        })
                        tempWorker.terminate()
                        resolve(msg.hash)
                        this.pendingHashTasks.delete(uid)
                        this.tempWorkerMap.delete(uid)
                        break

                    case "error": {
                        const errorMsg = formatError(msg.error)
                        this.updateFileState(uid, { status: "error", errorMsg })
                        tempWorker.terminate()
                        reject(new Error(errorMsg))
                        this.pendingHashTasks.delete(uid)
                        this.tempWorkerMap.delete(uid)
                        break
                    }
                }
            }

            // 错误监听 (Worker 加载失败等)
            tempWorker.onerror = event => {
                const errorMsg =
                    event instanceof ErrorEvent
                        ? event.message
                        : "Worker Init Failed"

                this.updateFileState(uid, {
                    status: "error",
                    errorMsg: "Worker Init Failed"
                })
                tempWorker.terminate()

                reject(new Error(errorMsg))
                this.pendingHashTasks.delete(uid)
                this.tempWorkerMap.delete(uid)
            }

            // 发送指令: 只算 Hash
            tempWorker.postMessage({ type: "only_hash", file: rawFile, uid })
        })

        this.pendingHashTasks.set(uid, task)

        return task
    }

    /**
     * 【重写】cancelUpload
     */
    public cancelUpload(uid: string) {
        // 1. 加入忽略名单 (立即生效，挡住 Worker 的后续消息)
        this.ignoringUIDs.add(uid)

        // 2. 终止临时 Worker (预计算阶段)
        if (this.tempWorkerMap.has(uid)) {
            this.tempWorkerMap.get(uid)?.terminate()
            this.tempWorkerMap.delete(uid)
            this.pendingHashTasks.delete(uid)
        }

        // 3. 通知主 Worker (上传阶段)
        if (this.worker) {
            this.worker.postMessage({ type: "cancel", uid })
        }

        // 4. 结算 Promise (Reject 一个特定的对象)
        const promiseHandler = this.promiseMap.get(uid)
        if (promiseHandler) {
            // 注意：这里我们 reject 一个带 status='cancelled' 的对象
            // 这样 await startUpload 的 catch 里就能判断出来
            promiseHandler.reject({
                status: "cancelled", // <--- 关键
                uid,
                file: this.fileRegistry.get(uid)!,
                error: new Error("Task Canceled")
            } as any) // 强转一下，或者修改 PromiseMap 的类型定义
            this.promiseMap.delete(uid)
        }

        // 5. 清理资源
        this.cleanup(uid)

        // 6. 更新 UI 状态为归零/取消
        this.updateFileState(uid, { status: "idle", progress: 0 })
        // 或者: this.updateFileState(uid, { status: "cancelled", progress: 0 })
    }

    /**
     * startUpload
     */
    public async startUpload(
        file: any,
        customOptions?: Partial<UploadConfig>
    ): Promise<UploadSuccessResult> {
        const rawFile = file.originFileObj ? file.originFileObj : file
        const uid = rawFile.uid || `${Date.now()}`

        // 【新增】开始新任务前，确保移出忽略名单
        this.ignoringUIDs.delete(uid)

        // 1. 获取当前状态
        const currentState = this.state[uid]

        // 2. 判断是否应该继承进度
        // 如果当前状态是 'calculating' (说明 preCalculate 正在跑)
        // 或者已经有 hash (说明算完了)，就保持当前进度，不要归零
        const initialProgress =
            currentState?.status === "calculating" || currentState?.hash
                ? currentState.progress
                : 0

        // 1. 基础状态设置 (同步)
        this.fileRegistry.set(uid, rawFile)
        this.updateFileState(uid, {
            uid,
            status: "calculating",
            progress: initialProgress
        })

        if (customOptions) this.setConfig(customOptions)

        let finalServerUrl = this.config.serverUrl
        if (finalServerUrl && !finalServerUrl.startsWith("http")) {
            finalServerUrl = new URL(finalServerUrl, window.location.origin)
                .href
        }

        // 2. 【核心修复】先处理 await 逻辑 (解耦 async 和 new Promise)
        let preCalculatedHash = this.state[uid]?.hash

        // 如果没有 Hash，且发现有正在计算的任务，先等待
        if (!preCalculatedHash && this.pendingHashTasks.has(uid)) {
            try {
                // 等待预计算完成
                preCalculatedHash = await this.pendingHashTasks.get(uid)
            } catch (err) {
                // 如果预计算失败了，直接抛出错误，终止上传流程
                this.cleanup(uid)
                this.updateFileState(uid, {
                    status: "error",
                    errorMsg: "Pre-calculation Failed"
                })
                // 抛出错误给外层的 Promise.allSettled
                throw {
                    status: "error",
                    uid,
                    file: rawFile,
                    error: err instanceof Error ? err : new Error(String(err))
                } as UploadErrorResult
            }
        }

        // 3. 返回由 Worker 驱动的 Promise
        return new Promise<UploadSuccessResult>((resolve, reject) => {
            // 注册 resolve/reject 句柄，等待 Worker 的 done/error 消息来触发
            this.promiseMap.set(uid, { resolve, reject })

            // 启动 Main Worker
            const worker = this.initWorker()

            const payload: WorkerInitPayload = {
                type: "init",
                uid,
                file: rawFile,
                config: {
                    serverUrl: finalServerUrl,
                    chunkSize: this.config.chunkSize,
                    concurrency: this.config.concurrency,
                    token: this.config.token,
                    checkEnabled: this.config.checkEnabled,
                    apiPaths: this.config.apiPaths,
                    showLog: this.config.showLog,

                    // 此时这里可能有值 (预计算成功)，也可能没值 (没预计算，由 Worker 自己算)
                    hash: preCalculatedHash
                }
            }

            worker.postMessage(payload)
        })
    }
}
