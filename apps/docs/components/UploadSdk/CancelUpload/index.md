在处理大文件上传时，允许用户中途停止任务是非常重要的交互体验。SDK 提供了两种不同粒度的控制方法：`cancelUpload` 和 `removeFile`。

## 核心方法

| 方法                    | 说明                                                                                                            | 适用场景                           |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------- | :--------------------------------- |
| **`cancelUpload(uid)`** | **停止上传，保留记录**。<br>中断 Worker 和网络请求，将状态变更为 `cancelled`，但文件依然保留在 `uploadMap` 中。 | 用户想暂停上传，或者稍后可能重试。 |
| **`removeFile(uid)`**   | **停止上传，删除记录**。<br>先执行取消操作，然后立即从 `uploadMap` 中移除该文件的数据。                         | 用户传错了文件，或者想清空列表。   |

## 捕获取消状态

当任务被取消时，`startUpload` 返回的 Promise 会被 Reject。你需要在 `catch` 块中通过 `UploadBatchError` 来识别哪些任务是被取消的。

```tsx | pure
import { UploadBatchError } from "@ql-frontend/upload-sdk"

const handleUpload = async () => {
    try {
        await startUpload(files)
    } catch (err) {
        if (err instanceof UploadBatchError) {
            // 筛选出被取消的任务
            const cancelledItems = err.results.filter(r => r.status === "cancelled")

            if (cancelledItems.length > 0) {
                console.log("用户手动取消了任务")
            }
        }
    }
}
```

## 完整示例

下方的 Demo 模拟了一个**慢速上传**的过程（每个切片耗时 1秒）。
你可以尝试：

1.  点击上传，在进度条走动时点击 **“取消”**。
2.  观察状态变为 `已取消`，此时可以再次点击 **“重试”**。
3.  点击 **“移除”** 直接清空文件。

<code src="./index.tsx" desc="取消、移除与重试的交互演示"></code>
