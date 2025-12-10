import { createSHA256 } from "hash-wasm"
import type { RequestOption, MainToWorkerMessage, HookContext, UploadConfig, WorkerMessage } from "../types"

// 存储等待中的 Promise
const pendingRequestMap = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>()

/**
 * 1. 初始化 RPC 监听 (需在 Worker 顶部调用)
 */
export const initRPCListener = () => {
    self.addEventListener("message", (e: MessageEvent<MainToWorkerMessage>) => {
        const msg = e.data
        // 只拦截 Hook 结果消息
        if (msg.type === "hook_result") {
            const { reqId, data, error } = msg
            if (pendingRequestMap.has(reqId)) {
                const { resolve, reject } = pendingRequestMap.get(reqId)!
                error ? reject(new Error(error)) : resolve(data)
                pendingRequestMap.delete(reqId)
            }
        }
    })
}

/**
 * 2. 呼叫主线程执行 Hook
 */
export const callMainThread = <T>(
    uid: string, //  必须传递 uid
    hookName: keyof NonNullable<UploadConfig["hooks"]>,
    ctx: HookContext
): Promise<T | null> => {
    return new Promise((resolve, reject) => {
        // 生成唯一请求ID
        const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`

        pendingRequestMap.set(reqId, { resolve, reject })

        // 发送 RPC 请求
        const payload: WorkerMessage = {
            type: "call_hook",
            reqId,
            uid,
            hookName,
            ctx // 注意：这里传的是不含 file/chunk 的纯 JSON 上下文
        }
        self.postMessage(payload)
    })
}

/**
 * 通用请求函数
 */
export const request = async (opt: RequestOption, token?: string) => {
    const headers: Record<string, string> = { ...opt.headers }
    if (token) headers["Authorization"] = `Bearer ${token}`

    // 注意：Worker 主逻辑会负责把 body 转换成 FormData，这里直接发
    const response = await fetch(opt.url, {
        method: opt.method || "POST",
        headers: headers,
        body: opt.body as BodyInit
    })

    if (!response.ok) throw new Error(`请求失败 [${response.status}]: ${response.statusText}`)
    try {
        return await response.json()
    } catch {
        return null
    }
}

/**
 * 计算 Hash
 */
export const calculateFileHash = async (file: File): Promise<string> => {
    const hasher = await createSHA256()
    const reader = new FileReader()
    const chunkSize = 10 * 1024 * 1024 // 10MB 切片
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0

    return new Promise(resolve => {
        reader.onload = e => {
            const bytes = new Uint8Array(e.target?.result as ArrayBuffer)

            // 【关键】流式更新，算完这块扔这块，不占内存
            hasher.update(bytes)

            currentChunk++
            if (currentChunk < chunks) {
                loadNext()
            } else {
                // 结束，输出 hex
                resolve(hasher.digest())
            }
        }

        function loadNext() {
            const start = currentChunk * chunkSize
            const end = Math.min(start + chunkSize, file.size)
            reader.readAsArrayBuffer(file.slice(start, end))
        }

        loadNext()
    })
}

export const log = (showLog: boolean = false, message: string) => {
    if (!showLog) return
    self.postMessage({ type: "log", message } as WorkerMessage)
}

/**
 * URL 拼接辅助函数
 *
 * 为什么需要它？
 * 1. **Blob Worker 环境限制**：本 SDK 的 Worker 是通过 `Blob URL` (内联字符串) 启动的。
 *    在这种环境下，Worker 的 `self.location.origin` 通常是 `blob:` 或 `null`，而不是主页面的域名。
 * 2. **fetch 路径解析失败**：如果在 Blob Worker 内直接发起相对路径请求（如 `fetch('/api/upload')`），
 *    浏览器无法将其解析为合法的 HTTP 地址，会报错 `Failed to execute 'fetch': Failed to parse URL from ...`。
 * 3. **体验优化**：该函数允许用户在 Hook 中只返回相对路径，由 SDK 自动将其与配置的 `serverUrl` 拼接为绝对路径，确保请求成功。
 *
 * @param baseUrl 全局配置的 serverUrl
 * @param relativePath Hook 返回的相对路径
 */
export const resolveUrl = (baseUrl: string, relativePath: string) => {
    if (!baseUrl) return relativePath
    // 如果已经是绝对路径（http://...），直接返回
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
        return relativePath
    }
    // 去除 baseUrl 尾部的 / 和 relativePath 头部的 /，防止双斜杠
    const base = baseUrl.replace(/\/$/, "")
    const path = relativePath.replace(/^\//, "")
    return `${base}/${path}`
}
