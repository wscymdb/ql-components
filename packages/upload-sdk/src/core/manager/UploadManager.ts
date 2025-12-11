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

    private initWorker() {
        if (!this.worker) {
            // 这里因为我们采取的方式是打包的时候把worker作为內联的方式，所以这里不需要生成临时的 URL
            // 1. 把字符串代码包装成 Blob 对象
            const blob = new Blob([workerCode], {
                type: "application/javascript"
            })
            // 2. 生成一个临时的 URL (blob:http://...)
            const workerUrl = URL.createObjectURL(blob)
            // 3. 传给原生 Worker 构造函数
            this.worker = new Worker(workerUrl)

            this.worker.onmessage = async (e: MessageEvent<WorkerMessage>) => {
                const msg = e.data

                // 1. 处理 RPC 请求 (Worker 想要执行 Hook)
                if (msg.type === "call_hook") {
                    await this.handleRPCCall(msg)
                    return
                }

                // 2. 日志
                if (msg.type === "log") {
                    console.log("[Worker]", msg.message)
                    return
                }

                // 3. 状态变更
                const { uid } = msg

                // 获取当前任务的 Promise 句柄 和 原始文件
                const promiseHandler = this.promiseMap.get(uid)
                const originalFile = this.fileRegistry.get(uid)
                switch (msg.type) {
                    case "progress":
                        this.updateFileState(uid, {
                            status: "uploading",
                            progress: msg.percent
                        })
                        break
                    case "done":
                        this.updateFileState(uid, {
                            status: "done",
                            progress: 100,
                            hash: msg.hash
                        })
                        // 结算 Promise：成功
                        if (promiseHandler && originalFile) {
                            promiseHandler.resolve({
                                status: "success",
                                uid,
                                file: originalFile,
                                hash: msg.hash
                            })
                            this.promiseMap.delete(uid) // 清理 Promise 句柄
                        }

                        this.fileRegistry.delete(uid) // 清理内存
                        break
                    case "error":
                        this.updateFileState(uid, {
                            status: "error",
                            errorMsg: msg.error
                        })

                        // 结算 Promise：失败 (注意这里我们是 reject 一个对象)
                        if (promiseHandler && originalFile) {
                            promiseHandler.reject({
                                status: "error",
                                uid,
                                file: originalFile,
                                error: new Error(msg.error) // 把错误信息包装成 Error 对象
                            })
                            this.promiseMap.delete(uid) // 清理 Promise 句柄
                        }

                        this.fileRegistry.delete(uid) // 清理内存
                        console.error(`上传失败 [${uid}]:`, msg.error)
                        break
                }
            }
        }
        return this.worker
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

    public startUpload(file: any, customOptions?: Partial<UploadConfig>) {
        return new Promise((resolve, reject) => {
            const rawFile = file.originFileObj ? file.originFileObj : file
            const uid = rawFile.uid || `${Date.now()}`

            // 1. 注册文件 (供 RPC 使用)
            this.fileRegistry.set(uid, rawFile)

            this.promiseMap.set(uid, { resolve, reject })

            this.updateFileState(uid, { uid, status: "uploading", progress: 0 })

            if (customOptions) this.setConfig(customOptions)

            const worker = this.initWorker()

            // 2. 发送初始化消息 (只传基础配置)
            const payload: WorkerInitPayload = {
                type: "init",
                uid,
                file: rawFile,
                config: {
                    serverUrl: this.config.serverUrl,
                    chunkSize: this.config.chunkSize,
                    concurrency: this.config.concurrency,
                    token: this.config.token,
                    checkEnabled: this.config.checkEnabled,
                    apiPaths: this.config.apiPaths,
                    showLog: this.config.showLog
                }
            }

            worker.postMessage(payload)
        })
    }
}
