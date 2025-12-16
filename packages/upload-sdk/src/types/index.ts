/**
 * ============================================================================
 * 基础数据结构
 * ============================================================================
 */
export interface ChunkItem {
    file: Blob
    filename: string
    index: number
}

/**
 * 网络请求配置对象 (Hook 的返回值)
 * RPC 模式下，这是一个纯 JSON 对象，不能包含 Blob/FormData
 */
export interface RequestOption {
    url: string
    method?: string
    headers?: Record<string, string>
    /**
     * 请求体参数 (键值对)
     * Worker 会自动把这里的 key-value 放入 FormData
     */
    body?: Record<string, any> | BodyInit | null

    /**
     * [新增] 告诉 Worker 将切片 Blob append 到 FormData 时使用的字段名
     * 默认为 'file'
     */
    chunkFieldName?: string
}

/**
 * Hook 上下文对象
 */
export interface HookContext {
    filename?: string
    hash?: string
    index?: number
    count?: number
    chunkSize?: number
    initData?: any
    /**
     * 原始文件对象
     * Manager 会在主线程自动注入，Worker 不需要传递此对象
     */
    file?: File

    /**  以下属性仅在 validateResponse 钩子中存在 */
    response?: any // 后端返回的响应体，
    hookName?: "check" | "upload" | "merge" // 当前触发校验的阶段名称
}

/**
 * ============================================================================
 * 配置项定义
 * ============================================================================
 */
export interface UploadConfig {
    serverUrl: string
    token?: string
    chunkSize?: number
    concurrency?: number
    checkEnabled?: boolean
    preventWindowClose?: boolean
    showLog?: boolean

    /**
     * RPC 模式 Hook：直接传函数，无需序列化
     */
    hooks?: {
        init?: (ctx: HookContext) => Promise<any> | any
        check?: (ctx: HookContext) => Promise<RequestOption> | RequestOption
        upload?: (ctx: HookContext) => Promise<RequestOption> | RequestOption
        merge?: (ctx: HookContext) => Promise<RequestOption> | RequestOption
        /**
         * [新增] 校验响应钩子
         * 如果校验不通过，请直接 throw Error('错误信息')
         */
        validateResponse?: (ctx: HookContext) => Promise<void> | void
    }

    apiPaths?: {
        check?: string
        upload?: string
        merge?: string
    }
}

/**
 * 发送给 Worker 的精简配置 (不含 hooks 函数)
 */
export type WorkerConfig = Omit<UploadConfig, "hooks"> & {
    /** 预计算的 Hash，如果存在，Worker 将跳过计算步骤 */
    hash?: string
}

/**
 * ============================================================================
 * 状态管理
 * ============================================================================
 */
export interface SingleFileState {
    uid: string
    progress: number
    name: string
    status:
        | "idle"
        | "calculating"
        | "ready"
        | "checking"
        | "uploading"
        | "done"
        | "error"
        | "cancelled"
    hash?: string
    errorMsg?: string
}
export type GlobalUploadState = Record<string, SingleFileState>
export type UploadListener = (state: GlobalUploadState) => void

/**
 * ============================================================================
 * 4. RPC 消息定义 (新增)
 * ============================================================================
 */

/** 主线程 -> Worker 的初始化消息 */
export interface WorkerInitPayload {
    type: "init"
    uid: string
    file: File
    config: WorkerConfig
}

/** Worker -> 主线程: 请求执行 Hook */
export interface RPCCallPayload {
    type: "call_hook"
    reqId: string
    uid: string // [关键] 用于主线程查找 File
    hookName: keyof NonNullable<UploadConfig["hooks"]>
    ctx: HookContext
}

/** 主线程 -> Worker: Hook 执行结果 */
export interface RPCResultPayload {
    type: "hook_result"
    reqId: string
    data?: any
    error?: string
}

/** Worker -> 主线程: 常规汇报 */
export type WorkerReportMessage =
    | { type: "progress"; uid: string; percent: number }
    | { type: "hash_progress"; uid: string; percent: number }
    | { type: "done"; uid: string; hash: string }
    | { type: "error"; uid: string; error: string }
    | { type: "hash_result"; uid: string; hash: string } // 用于 preCalculate 的结果
    | { type: "log"; message: string }

export type WorkerMessage = RPCCallPayload | WorkerReportMessage
export type MainToWorkerMessage =
    | WorkerInitPayload
    | RPCResultPayload
    | { type: "cancel"; uid: string }

export interface UploadSuccessResult {
    status: "success"
    uid: string
    file: File
    hash: string
}

export interface UploadErrorResult {
    status: "error"
    uid: string
    file: File
    error: Error
}

export interface UploadCancelledResult {
    status: "cancelled"
    uid: string
    file: File
}

// 联合类型
export type UploadResult =
    | UploadSuccessResult
    | UploadErrorResult
    | UploadCancelledResult
