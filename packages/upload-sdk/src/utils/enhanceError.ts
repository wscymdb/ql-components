import { UploadResult } from "../types"

/**
 * 自定义批量上传错误类
 * 专门用于携带 results 列表
 */
export class UploadBatchError extends Error {
    public results: UploadResult[]

    constructor(message: string, results: UploadResult[]) {
        super(message)
        this.name = "UploadBatchError"
        this.results = results

        // 修复 TypeScript 继承 Error 的原型链问题 (ES5环境需要)
        Object.setPrototypeOf(this, UploadBatchError.prototype)
    }
}
