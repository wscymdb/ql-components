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
import { ConcurrencyController } from "@/utils/ConcurrencyController"

// 默认配置
const DEFAULT_CONFIG: UploadConfig = {
    serverUrl: "",
    chunkSize: 5 * 1024 * 1024,
    chunkConcurrency: 3,
    checkEnabled: true,
    preventWindowClose: true,
    showLog: false,
    uploadConcurrency: 3,
    hashConcurrency: 3,
    apiPaths: {
        check: "/upload_already",
        upload: "/upload_chunk",
        merge: "/upload_merge"
    }
}

// 定义内部控制流异常 (不需要导出)
class FlowControlException {
    constructor(
        public type: "success" | "fail",
        public payload: any
    ) { }
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

    // 【新增】并发控制器
    private uploadConcurrencyController: ConcurrencyController<UploadSuccessResult>
    private hashConcurrencyController: ConcurrencyController<string>

    private constructor() {
        // 初始化并发控制器
        this.uploadConcurrencyController = new ConcurrencyController<UploadSuccessResult>(
            DEFAULT_CONFIG.uploadConcurrency
        )
        this.hashConcurrencyController = new ConcurrencyController<string>(
            DEFAULT_CONFIG.hashConcurrency
        )

        window.addEventListener("beforeunload", e => {
            if (!this.config.preventWindowClose) return
            const isUploading = Object.values(this.state).some(item => item.status === "uploading")
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
                        this.handleDone(uid, msg.hash, msg.data)

                        break
                    case "error":
                        this.handleError(uid, msg.error)

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

    private handleDone(uid: string, hash: string, data?: any) {
        // 获取当前任务的 Promise 句柄 和 原始文件
        const promiseHandler = this.promiseMap.get(uid)
        const originalFile = this.fileRegistry.get(uid)

        this.updateFileState(uid, { status: "done", progress: 100, hash })

        if (promiseHandler && originalFile) {
            promiseHandler.resolve({
                status: "success",
                uid,
                file: originalFile,
                hash,
                data
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
                const fullCtx: HookContext = {
                    ...ctx,
                    file: originalFile,
                    // 实现 success: 抛出内部异常，携带数据
                    success: (data?: any) => {
                        throw new FlowControlException("success", data)
                    },

                    //  实现 fail: 抛出内部异常，携带错误信息
                    fail: (message: string, code?: string) => {
                        throw new FlowControlException("fail", { message, code })
                    }
                }

                // 4. 执行 Hook (运行在主线程，可访问闭包)
                const result = await userHook(fullCtx)
                reply.data = result
            }
        } catch (error) {
            if (error instanceof FlowControlException) {
                // 这是一个正常的流程控制，不是代码报错
                reply.data = {
                    __action__: error.type, // 'success' | 'fail'
                    payload: error.payload
                }
            } else {
                // 这是一个真正的代码错误
                reply.error = formatError(error)
            }
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
        if (!UploadManager.instance) UploadManager.instance = new UploadManager()
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

        // 同步更新并发控制器
        if (options.uploadConcurrency !== undefined) {
            this.uploadConcurrencyController.updateConcurrency(options.uploadConcurrency)
        }
        if (options.hashConcurrency !== undefined) {
            this.hashConcurrencyController.updateConcurrency(options.hashConcurrency)
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
     * 使用独立的临时 Worker,不影响主流程
     */
    public async computeHash(file: any): Promise<string> {
        const rawFile = file.originFileObj || file
        const uid = rawFile.uid || `${Date.now()}`

        // 1. 如果已经算好了,直接返回
        const existing = this.state[uid]
        if (existing?.hash) return existing.hash

        // 如果正在计算,直接返回正在跑的 Promise (复用)
        if (this.pendingHashTasks.has(uid)) {
            return this.pendingHashTasks.get(uid)!
        }

        // 2. 先设置为 queued 状态
        this.updateFileState(uid, {
            uid,
            name: rawFile.name,
            status: "queued",
            progress: 0
        })

        // 3. 通过并发控制器执行 Hash 计算
        const task = this.hashConcurrencyController.run(async () => {
            // 进入并发控制器后,更新状态为 calculating
            this.updateFileState(uid, {
                status: "calculating",
                progress: 0
            })

            return new Promise<string>((resolve, reject) => {
                // 创建一个新的临时 Worker,用完即焚
                const tempWorker = new Worker(this.getWorkerBlobUrl())

                // 存入 Map
                this.tempWorkerMap.set(uid, tempWorker)

                tempWorker.onmessage = e => {
                    const msg = e.data

                    // 这里也做同样的类型收窄
                    if (msg.type === "log") return

                    switch (msg.type) {
                        case "hash_progress":
                            // 【关键】收到进度,更新状态
                            this.updateFileState(uid, {
                                status: "calculating",
                                progress: msg.percent
                            })
                            break

                        case "hash_result":
                            this.updateFileState(uid, {
                                status: "ready",
                                hash: msg.hash,
                                progress: 100
                            })
                            tempWorker.terminate()
                            resolve(msg.hash)
                            this.tempWorkerMap.delete(uid)
                            break

                        case "error": {
                            const errorMsg = formatError(msg.error)
                            this.updateFileState(uid, { status: "error", errorMsg })
                            tempWorker.terminate()
                            reject(new Error(errorMsg))
                            this.tempWorkerMap.delete(uid)
                            break
                        }
                    }
                }

                // 错误监听 (Worker 加载失败等)
                tempWorker.onerror = event => {
                    const errorMsg = event instanceof ErrorEvent ? event.message : "Worker Init Failed"

                    this.updateFileState(uid, {
                        status: "error",
                        errorMsg: "Worker Init Failed"
                    })
                    tempWorker.terminate()

                    reject(new Error(errorMsg))
                    this.tempWorkerMap.delete(uid)
                }

                // 发送指令: 只算 Hash
                tempWorker.postMessage({ type: "only_hash", file: rawFile, uid })
            })
        })

        this.pendingHashTasks.set(uid, task)

        // 任务完成后清理
        task.finally(() => {
            this.pendingHashTasks.delete(uid)
        })

        return task
    }

    /**
     * 取消上传/计算
     * 作用：停止 Worker，断开 Promise，将状态设为 'cancelled'
     * 后果：文件依然在 uploadMap 中，只是状态变了
     */
    public cancelUpload(uid: string) {
        // 1. 屏蔽消息
        this.ignoringUIDs.add(uid)

        // 2. 终止临时 Worker (预计算)
        if (this.tempWorkerMap.has(uid)) {
            this.tempWorkerMap.get(uid)?.terminate()
            this.tempWorkerMap.delete(uid)
            this.pendingHashTasks.delete(uid)
        }

        // 3. 通知主 Worker (上传中)
        if (this.worker) {
            this.worker.postMessage({ type: "cancel", uid })
        }

        // 4. Reject Promise
        const promiseHandler = this.promiseMap.get(uid)
        if (promiseHandler) {
            promiseHandler.reject({
                status: "cancelled",
                uid,
                file: this.fileRegistry.get(uid)!,
                error: new Error("Task Canceled")
            } as any)
            this.promiseMap.delete(uid)
        }

        // 5. 资源清理
        this.cleanup(uid)

        // 6. 【关键】只更新状态，不删除！
        this.updateFileState(uid, { status: "cancelled", progress: 0 })
    }

    /**
     * 移除文件
     * 作用：先执行取消操作（防止后台还在跑），然后从 uploadMap 中彻底删除
     */
    public removeFile(uid: string) {
        // 1. 为了安全，先调用 cancel，确保后台 Worker 停掉
        // (cancelUpload 内部有防抖判断，重复调用没问题的，或者你可以判断下状态)
        this.cancelUpload(uid)

        // 2. 从 State 中物理删除
        const newState = { ...this.state }
        delete newState[uid]
        this.state = newState

        // 3. 通知 UI 更新
        this.listeners.forEach(l => l(this.state))
    }
    /**
     * 【新增】全局重置/清空方法
     * 用于关闭弹窗时彻底清理所有状态和后台任务
     */
    public reset() {
        // 1. 获取当前所有任务 ID
        const allUids = Object.keys(this.state)

        // 2. 终止所有正在运行的任务
        allUids.forEach(uid => {
            // A. 终止临时 Hash Worker (物理查杀)
            if (this.tempWorkerMap.has(uid)) {
                this.tempWorkerMap.get(uid)?.terminate()
            }

            // B. 拒绝所有正在等待的 Promise (防止 await 悬挂)
            const promiseHandler = this.promiseMap.get(uid)
            if (promiseHandler) {
                promiseHandler.reject({
                    status: "cancelled",
                    uid,
                    file: this.fileRegistry.get(uid)!, // 可能为 undefined，强转一下或者加判断
                    error: new Error("Reset")
                } as any)
            }
        })

        // 3. 通知主 Worker 取消所有任务 (如果有的话)
        // 既然是 Reset，我们可以简单地发一个 reset 指令，或者循环 cancel
        // 这里为了简单，我们假设主 Worker 还在跑，我们直接发指令让它停掉手头的活
        if (this.worker) {
            allUids.forEach(uid => {
                this.worker!.postMessage({ type: "cancel", uid })
            })
            // 或者：直接 terminate 主 Worker 重启一个？
            // 不建议 terminate 主 Worker，因为重建开销大，且 Worker 是无状态的，cancel 足够了
        }

        // 4. 【核心】暴力清空所有数据结构
        this.tempWorkerMap.clear()
        this.pendingHashTasks.clear()
        this.promiseMap.clear()
        this.fileRegistry.clear()
        this.ignoringUIDs.clear()
        // this.taskHandlers.clear() // 如果你还没删的话

        // 5. 【核心】重置状态为空对象
        this.state = {}

        // 6. 通知 UI 更新 (UI 会变为空白)
        this.listeners.forEach(l => l(this.state))
    }

    /**
     * 启动上传核心方法
     *
     * @description
     * 1. 支持异步 await 调用，阻塞直到上传完成/失败/取消
     * 2. 智能状态流转：
     *    - 如果已预计算完成 (Ready) -> 状态变为 'checking' (连接服务器中)
     *    - 如果正在预计算 (Calculating) -> 保持进度，等待计算完成
     *    - 如果是新任务 -> 状态变为 'calculating' (从头计算)
     * 3. 自动复用正在进行的 Hash 计算任务，避免重复计算
     *
     * @param file - 上传的文件对象 (原生 File 或 Antd 包装对象)
     * @param customOptions - 本次任务专用的配置 (如 API 路径、Hooks)
     * @returns Promise<UploadSuccessResult> - 成功返回结果，失败/取消抛出异常
     */
    public async startUpload(file: any, customOptions?: Partial<UploadConfig>): Promise<UploadSuccessResult> {
        // 1. 提取原始文件对象和 UID
        const rawFile = file.originFileObj ? file.originFileObj : file
        const uid = rawFile.uid || `${Date.now()}`

        // 如果 promiseMap 中存在该 UID,说明上一次的 startUpload 还没结束(Done/Error/Cancel 都会清理 Map)
        if (this.promiseMap.has(uid)) {
            throw {
                status: "error",
                uid,
                file: rawFile,
                error: new Error("Task is already running"),
                code: "TASK_RUNNING"
            } as UploadErrorResult
        }

        // 2. 【关键修复】移出忽略名单
        // 如果该文件之前被取消过,UID 会在忽略名单里。
        // 这里必须移除,否则新启动的任务发来的 Worker 消息会被 Manager 丢弃,导致进度条不动。
        this.ignoringUIDs.delete(uid)

        // 3. 注册文件引用 (供 RPC 钩子读取)
        this.fileRegistry.set(uid, rawFile)

        // 4. 应用临时配置
        if (customOptions) this.setConfig(customOptions)

        // 5. 先设置为 queued 状态
        this.updateFileState(uid, {
            uid,
            name: rawFile.name,
            status: "queued",
            progress: 0
        })

        // 6. 通过并发控制器执行上传任务
        return this.uploadConcurrencyController.run(async () => {
            // ============================================================
            // 进入并发控制器后,开始实际的上传流程
            // ============================================================

            const currentState = this.state[uid]

            // 判断依据:
            // ready: 表示 Hash 已经算好,下一步就是发请求
            // calculating: 表示正在预计算中
            const isReady = currentState?.status === "ready"
            const isCalculating = currentState?.status === "calculating"

            // 决定初始状态:
            // - 如果 Ready -> 设为 'checking' (表示正在进行 Init/Check 阶段,连接服务器)
            // - 否则 -> 设为 'calculating' (表示需要计算 Hash)
            const initialStatus = isReady ? "checking" : "calculating"

            // 决定初始进度:
            // - 如果 Ready -> 归 0 (准备开始上传流程)
            // - 如果正在算 -> 继承当前进度 (比如 50%),防止 UI 闪回 0
            const initialProgress = isReady ? 0 : isCalculating ? currentState?.progress || 0 : 0

            // 更新 UI
            this.updateFileState(uid, {
                status: initialStatus,
                progress: initialProgress
            })

            // 处理 serverUrl 相对路径 (适配开发环境 Proxy)
            // 将 "/api" 转换为 "http://localhost:3000/api"
            let finalServerUrl = this.config.serverUrl
            if (finalServerUrl && !finalServerUrl.startsWith("http")) {
                finalServerUrl = new URL(finalServerUrl, window.location.origin).href
            }

            // ============================================================
            // 等待 Hash 策略 (解决重复计算问题)
            // ============================================================

            // 尝试获取已有的 Hash
            let preCalculatedHash = this.state[uid]?.hash

            // 如果没有 Hash,但发现有一个正在计算的任务 (preCalculate 正在跑)
            if (!preCalculatedHash && this.pendingHashTasks.has(uid)) {
                try {
                    // 【核心】在这里"搭便车",等待预计算 Worker 完成
                    // 此时 UI 进度条由那个临时 Worker 驱动
                    preCalculatedHash = await this.pendingHashTasks.get(uid)
                } catch (err) {
                    // 如果预计算挂了 (比如文件读取失败),直接终止本次上传
                    this.cleanup(uid)
                    this.updateFileState(uid, {
                        status: "error",
                        errorMsg: "Pre-calculation Failed"
                    })

                    // 抛出错误,让外层 await startUpload 捕获
                    throw {
                        status: "error",
                        uid,
                        file: rawFile,
                        error: err instanceof Error ? err : new Error(String(err))
                    } as UploadErrorResult
                }
            }

            // ============================================================
            // 启动主流程 (返回 Promise)
            // ============================================================

            return new Promise<UploadSuccessResult>((resolve, reject) => {
                // 注册 Promise 句柄,等待 Worker 发回 'done' 或 'error' 消息
                // 这里的 resolve/reject 会在 onmessage 中被调用
                this.promiseMap.set(uid, { resolve, reject })

                // 获取或创建主 Worker
                const worker = this.initWorker()

                // 构造初始化 Payload
                const payload: WorkerInitPayload = {
                    type: "init",
                    uid,
                    file: rawFile,
                    config: {
                        serverUrl: finalServerUrl,
                        chunkSize: this.config.chunkSize,
                        chunkConcurrency: this.config.chunkConcurrency,
                        token: this.config.token,
                        // checkEnabled: this.config.checkEnabled, // 暂不支持
                        apiPaths: this.config.apiPaths,
                        showLog: this.config.showLog,

                        // 【关键】将 Hash 传给 Worker
                        // Worker 收到这个值后,会直接跳过内部的计算步骤,直接进入 Upload
                        hash: preCalculatedHash
                    }
                }

                // 发送指令
                worker.postMessage(payload)
            })
        })
    }
}
