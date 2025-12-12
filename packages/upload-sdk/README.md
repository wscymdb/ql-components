# upload-sdk

一个基于 **Web Worker** 和 **RPC (远程过程调用)** 架构的高性能大文件切片上传 SDK。

它将繁重的计算（Hash 计算）和 I/O 操作（并发请求）隔离在 Worker 线程中，确保主线程 UI 永不卡顿，同时通过 RPC 机制允许开发者在主线程完全接管上传流程。

## ✨ 特性

-   **🚀 零阻塞 UI**：全量计算 Hash、切片、并发上传均在 Web Worker 中执行。
-   **🔗 RPC 架构**：逻辑在主线程定义（可访问组件闭包/Store/Router），执行在 Worker 线程。
-   **💾 极低内存占用**：采用流式处理和零拷贝引用机制，轻松支持 10GB+ 超大文件。
-   **⚡️ 智能秒传**：内置 Hash 计算与秒传检测逻辑，支持断点续传。
-   **🛡️ 业务级校验**：提供 `validateResponse` 钩子，轻松拦截 Token 过期、业务错误码等逻辑。
-   **🎨 灵活钩子**：提供全生命周期 Hooks，流程为 `Hash` -> `Init` -> `Check` -> `Upload` -> `Merge`。

## 📦 安装

```bash
npm i @ql-react-components/upload-sdk
# or
yarn add @ql-react-components/upload-sdk
# or
pnpm add @ql-react-components/upload-sdk
```

## 🔨 快速上手

### 1. 全局配置

推荐在应用根组件（如 `App.tsx`）进行初始化配置。

SDK 内置了默认的接口路径（`/upload_chunk` 等），如果你的后端接口符合默认规范，甚至不需要配置 `hooks`。但大多数情况下，你需要根据业务定制。

```tsx
import { useEffect } from "react"
import { UploadManager } from "upload-sdk"

const App = () => {
    useEffect(() => {
        const manager = UploadManager.getInstance()
        const isDev = process.env.NODE_ENV === "development"

        manager.setConfig({
            // 开发环境使用当前域 (触发 Proxy)，生产环境使用真实地址
            serverUrl: isDev
                ? window.location.origin
                : "https://api.production.com",
            concurrency: 3,

            // 自定义接口路径 (可选，用于覆盖默认值)
            apiPaths: {
                check: "/api/check_file",
                upload: "/api/upload_part",
                merge: "/api/merge_file"
            },

            hooks: {
                // 1. 初始化 (获取 uploadId)
                // 此时 Hash 已计算完成，可带给后端做预检查
                init: async ctx => {
                    const res = await fetch("/api/init", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: ctx.file?.name,
                            hash: ctx.hash,
                            totalChunks: ctx.count
                        })
                    })
                    return (await res.json()).data
                },

                // 2. 业务结果校验 (核心)
                // Worker 每次请求后都会回调此钩子
                validateResponse: ({ response, hookName }) => {
                    // 假设后端返回 { code: 0, msg: "ok" }
                    if (response.code !== 0) {
                        // 针对 Check 阶段的失败，可以抛错让 Worker 自动降级为全量上传
                        if (hookName === "check")
                            throw new Error("Check Failed")

                        // 其他阶段抛错，会导致上传任务失败 (变红)
                        throw new Error(response.msg || "上传失败")
                    }
                },

                // 3. 上传分片 (可选，不传则使用默认逻辑)
                upload: ctx => {
                    return {
                        url: "/api/upload_part", // 相对路径，自动拼接 serverUrl
                        method: "POST",
                        // 告诉 Worker 将切片放入 formData 的 'file' 字段
                        chunkFieldName: "file",
                        // 其他业务参数
                        body: {
                            hash: ctx.hash,
                            index: ctx.index,
                            uploadId: ctx.initData.uploadId // 透传 init 返回的数据
                        }
                    }
                },

                // 4. 合并文件 (可选)
                merge: ctx => {
                    return {
                        url: "/api/merge_file",
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            hash: ctx.hash,
                            uploadId: ctx.initData.uploadId
                        })
                    }
                }
            }
        })
    }, [])

    return <YourPage />
}
```

### 2. 组件中使用

```tsx
import React from "react"
import { useUpload } from "upload-sdk"

const FileUploader = () => {
    const { startUpload, uploadMap } = useUpload()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            startUpload(e.target.files)
        }
    }

    return (
        <div>
            <input type="file" multiple onChange={handleFileChange} />

            {Object.values(uploadMap).map(file => (
                <div key={file.uid} style={{ marginTop: 10 }}>
                    <div>
                        {file.uid} - {file.status}
                    </div>
                    <progress value={file.progress} max={100} />
                    {file.status === "error" && (
                        <div style={{ color: "red" }}>{file.errorMsg}</div>
                    )}
                </div>
            ))}
        </div>
    )
}
```

---

## 🧩 API 文档

### `UploadConfig`

| 属性                 | 类型      | 默认值 | 说明                                                                             |
| -------------------- | --------- | ------ | -------------------------------------------------------------------------------- |
| `serverUrl`          | `string`  | -      | **必填**。后端基础地址。开发环境建议设为 `window.location.origin` 以支持 Proxy。 |
| `chunkSize`          | `number`  | `5MB`  | 单个切片大小 (字节)。                                                            |
| `concurrency`        | `number`  | `3`    | 并发上传数。建议 3-6，过大可能导致浏览器卡顿。                                   |
| `checkEnabled`       | `boolean` | `true` | 是否开启秒传/断点续传检查。                                                      |
| `apiPaths`           | `object`  | `{}`   | 快捷配置接口路径，如果不想写 Hook 可以直接配这个。                               |
| `hooks`              | `Hooks`   | -      | 生命周期钩子 (见下文)。                                                          |
| `preventWindowClose` | `boolean` | `true` | 上传中是否拦截浏览器关闭/刷新。                                                  |

### `Hooks` (核心)

所有 Hooks 均运行在 **主线程**。SDK 内部对 `check`、`upload`、`merge` 均有默认的生成器实现，**如果你的接口符合默认规范，可以不传这些 Hooks**。

#### 通用 Context (`ctx`)

```typescript
interface HookContext {
    file: File // 原始文件对象 (主线程引用，零开销)
    filename: string // 文件名
    count: number // 总切片数
    chunkSize: number
    hash: string // 文件 Hash (Init 阶段即可获取)
    initData: any // init 阶段的返回值
    index?: number // 当前切片索引 (仅 upload 阶段)
    response?: any // 后端接口返回的数据 (仅 validateResponse 阶段)
    hookName?: string // 当前阶段名称 ('check' | 'upload' | 'merge')
}
```

#### 1. `init(ctx)`

-   **必需**：否 (但推荐)
-   **作用**：任务初始化。常用于获取 `uploadId` 或进行权限检查。
-   **时机**：在 Hash 计算完成后执行。因此 `ctx.hash` 此刻可用。

#### 2. `check(ctx)`

-   **必需**：否 (有默认实现)
-   **默认行为**：`GET ${apiPaths.check}?HASH=...`
-   **作用**：秒传检查。返回 `RequestOption`。
-   **注意**：如果此阶段请求失败或 `validateResponse` 抛错，Worker 会自动降级为全量上传（不会报错终止）。

#### 3. `upload(ctx)`

-   **必需**：否 (有默认实现)
-   **默认行为**：`POST ${apiPaths.upload}` (自动组装 FormData)
-   **作用**：构造切片上传请求。
-   **返回值**：`RequestOption`。
-   **⚠️ 警告**：不要在此 Hook 中 `new FormData()`，也不要试图访问切片二进制数据。只返回 JSON 配置，Worker 会负责组装。

#### 4. `merge(ctx)`

-   **必需**：否 (有默认实现)
-   **默认行为**：`POST ${apiPaths.merge}`
-   **作用**：通知后端合并文件。

#### 5. `validateResponse(ctx)`

-   **必需**：否
-   **作用**：统一拦截后端业务错误（如 `code !== 0`）。
-   **逻辑**：
    -   如果抛出 `Error`，Worker 会捕获。
    -   `check` 阶段抛错 -> 忽略并继续上传。
    -   `upload`/`merge` 阶段抛错 -> 任务终止，状态变为 `error`。

---

## ❓ FAQ (常见问题与设计决策)

### Q1: 为什么开发环境配置 `serverUrl` 时 Proxy 代理失败？

**现象**：配置了 `http://localhost:8888`，浏览器控制台显示跨域 (CORS) 或 404，未经过 Vite/Webpack Proxy。
**原因**：SDK 的 Worker 是通过 `Blob URL` 启动的。Blob Worker 内发起的绝对路径请求（如 `http://localhost:8888/...`）会直接由浏览器发出，绕过开发服务器。
**解决**：在开发环境将 `serverUrl` 设置为 `window.location.origin` (即当前前端页面地址，如 `http://localhost:3000`)。这样请求会发给开发服务器，从而触发 Proxy 转发规则。

### Q2: 为什么 `upload` Hook 里拿不到 `ctx.chunk` (切片二进制)？

**设计决策**：为了极致性能。
切片 (`Blob`) 是在 Worker 线程生成的。如果 SDK 将每个切片通过 RPC 传回主线程给 Hook 使用，会导致频繁的线程间通信和数据序列化（结构化克隆），严重拖慢上传速度。
**模式**：我们采用了 **"配置生成器"** 模式。主线程只负责生成 JSON 配置（URL、参数），Worker 在另一端负责将配置与它持有的 `chunk` 进行物理组装和发送。

### Q3: 传递 `File` 对象给 Worker 或 Hook 会导致内存暴涨吗？

**不会。**

-   **主线程 Hook**：`ctx.file` 是通过引用传递的，不涉及拷贝，耗时 0ms。
-   **Worker 通信**：浏览器底层对 `File` 和 `Blob` 进行了特殊优化（Disk-Backed Objects）。通过 `postMessage` 传递 10GB 的文件给 Worker，实际上只传递了一个文件句柄（Metadata），不会读取文件内容，也是瞬间完成的。

### Q4: 如何自定义 Hash 算法？

**答**：SDK 默认使用流式 SHA-256 计算 Hash。目前为了性能和稳定性，移除了主线程自定义 Hash 的 Hook。
如果确实需要更改算法（如 MD5），建议 Clone 源码修改 `worker/worker.utils.ts` 中的 `calculateFileHash` 函数，或者在 `init` 钩子中传入预先计算好的 Hash（如果业务允许）。
