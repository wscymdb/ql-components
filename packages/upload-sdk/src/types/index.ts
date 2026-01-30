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
 * 基础数据部分 (Worker -> 主线程 传输用)
 * 这里只包含可序列化的 JSON 数据
 */
export interface HookContextData {
    filename?: string
    hash?: string
    index?: number
    count?: number
    chunkSize?: number
    initData?: any
    response?: any // 只存在于 validateResponse 钩子
    hookName?: "check" | "upload" | "merge" // 当前触发校验的阶段名称
}

/**
 * 完整上下文 (主线程 -> 用户 Hook 用)
 * 包含数据 + 注入的方法/对象
 */
export interface HookContext extends HookContextData {
    // 原始文件对象 (Worker 无法传递，主线程注入)
    file?: File

    // 控制流方法 (主线程注入)
    success: (data?: any) => never
    fail: (message: string, code?: string) => never
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
    checkEnabled?: boolean
    preventWindowClose?: boolean
    showLog?: boolean

    /**
     * 上传任务并发数 (同时进行的文件上传数量)
     * 默认为 3
     */
    uploadConcurrency?: number

    /**
     * Hash 计算并发数 (同时进行的 Hash 计算任务数量)
     * 默认为 3
     */
    hashConcurrency?: number

    /**
     * 切片上传并发数 (每个文件同时上传的切片数量)
     * 默认为 3
     */
    chunkConcurrency?: number

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
    status: "idle" | "queued" | "calculating" | "ready" | "checking" | "uploading" | "done" | "error" | "cancelled"
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
    ctx: HookContextData
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
    | { type: "done"; uid: string; hash: string; data?: any }
    | { type: "error"; uid: string; error: string; code?: string }
    | { type: "hash_result"; uid: string; hash: string } // 用于 preCalculate 的结果
    | { type: "log"; message: string }

export type WorkerMessage = RPCCallPayload | WorkerReportMessage
export type MainToWorkerMessage = WorkerInitPayload | RPCResultPayload | { type: "cancel"; uid: string }

export type UploadErrorCode = "TASK_RUNNING"
export interface UploadSuccessResult {
    status: "success"
    uid: string
    file: File
    hash: string
    data?: any
}

export interface UploadErrorResult {
    status: "error"
    uid: string
    file: File
    error: Error
    code?: UploadErrorCode
}

export interface UploadCancelledResult {
    status: "cancelled"
    uid: string
    file: File
}

// 联合类型
export type UploadResult = UploadSuccessResult | UploadErrorResult | UploadCancelledResult

/**
 * ============================================================================
 * 配置系统类型定义
 * ============================================================================
 */

/**
 * Setup 配置(与 UploadConfig 相同)
 * - 第一次调用：完整初始化所有配置
 * - 后续调用：只更新 hooks 和 token
 */
export type SetupConfig = UploadConfig

/**
 * 初始化配置(已废弃，请使用 SetupConfig)
 * @deprecated 使用 SetupConfig 代替
 */
export type InitializeConfig = UploadConfig

/**
 * 更新配置(不能修改 serverUrl)
 */
export type UpdateConfig = Partial<Omit<UploadConfig, "serverUrl">>

/**
 * 单文件上传配置
 */
export interface StartUploadOptions {
    hooks?: UploadConfig["hooks"]
    apiPaths?: UploadConfig["apiPaths"]
}

/**
 * 任务级配置快照（只包含需要快照的配置项）
 * - hooks: 业务钩子函数，绑定到任务创建时的上下文
 * - apiPaths: API 路径配置，绑定到任务创建时的配置
 */
export interface TaskConfig {
    hooks?: UploadConfig["hooks"]
    apiPaths?: UploadConfig["apiPaths"]
}
