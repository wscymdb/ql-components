/**
 * 通用错误格式化工具
 * 确保无论 Error 是对象、字符串还是其他，都能转成可读的字符串
 */
export const formatError = (err: any): string => {
    // 1. 如果是标准 Error 对象
    if (err instanceof Error) return err.message

    // 2. 如果已经是字符串
    if (typeof err === "string") return err

    // 3. 如果是对象 (尝试 JSON 序列化，避免 [object Object])
    if (err && typeof err === "object") {
        try {
            return JSON.stringify(err)
        } catch {
            // 序列化失败（比如有循环引用），降级处理
            return String(err)
        }
    }

    // 4. 其他情况 (undefined, null, number 等)
    return String(err)
}
