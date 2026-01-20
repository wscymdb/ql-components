## 错误处理

在使用 Upload SDK 时，错误处理主要分为两个层面：**业务逻辑校验**（拦截后端错误码）和 **批量任务捕获**（处理部分失败的情况）。

### 拦截业务错误 (`validateResponse`)

SDK 内部的 Worker 仅根据 HTTP 状态码（200-299）判断请求是否成功。但在实际业务中，后端往往会返回 HTTP 200，并在 Body 中通过 `code` 或 `success` 字段来标识业务结果。

你需要配置 `validateResponse` 钩子，并使用 **`ctx.fail(message)`** 来优雅地中断上传。

```tsx | pure
setup({
    hooks: {
        validateResponse: ctx => {
            // 假设后端规范：code !== 0 即为失败
            if (ctx.response.code !== 0) {
                // ✅ 推荐做法：调用 ctx.fail
                // Worker 会停止上传并将状态置为 error，且不会在控制台产生红色报错堆栈
                ctx.fail(ctx.response.msg || "上传失败")

                // ❌ 旧做法 (不推荐)：throw new Error(...)
            }
        }
    }
})
```

### 捕获上传结果

`startUpload` 是一个异步方法。当上传多个文件时，SDK 会等待**所有文件**都处理完毕（无论成功还是失败）后才结束 Promise。

- **全部成功**：Promise Resolve，返回结果列表。
- **存在失败**：Promise Reject，抛出 `UploadBatchError`。

你需要使用 `try...catch` 结构，并通过 `UploadBatchError` 获取详细的成功/失败清单。

```tsx | pure
import { UploadBatchError } from "@ql-react-components/upload-sdk"

const handleUpload = async () => {
    try {
        // 等待所有文件结束
        const results = await startUpload(files)
        console.log("全部成功:", results)
    } catch (err) {
        // 捕获批量任务中的部分失败
        if (err instanceof UploadBatchError) {
            // err.results 包含所有文件的最终状态
            const total = err.results.length
            const fails = err.results.filter(r => r.status === "error")

            console.error(`总计 ${total} 个，失败 ${fails.length} 个`)

            // 打印具体的失败原因
            fails.forEach(f => console.log(f.file.name, f.error.message))
        }
    }
}
```

### 示例

下方的 Demo 模拟了一个业务场景：**文件名中包含 "fail" 的文件会被模拟为业务校验失败**。

请尝试同时选择一个正常文件和一个重命名为 `fail.png` 的文件，观察“部分失败”的效果。

<code src="./index.tsx" desc="模拟部分失败的场景"></code>
