这份文档参考了 Ant Design 的技术文档风格，结构清晰，重点突出了 **RPC 模式** 的使用方法，并在 FAQ 中详细记录了我们之前讨论过的技术难点和设计决策。

---

# UploadSDK

一个基于 **Web Worker** 和 **RPC (远程过程调用)** 架构的高性能大文件切片上传 SDK。

它将繁重的计算（Hash 计算）和 I/O 操作（并发请求）隔离在 Worker 线程中，确保主线程 UI 永不卡顿，同时通过 RPC 机制允许开发者在主线程完全接管上传流程。

## ✨ 特性

-   **🚀 零阻塞 UI**：全量计算 Hash、切片、并发上传均在 Web Worker 中执行。
-   **🔗 RPC 架构**：逻辑在主线程定义（可访问组件闭包/Store），执行在 Worker 线程。
-   **💾 极低内存占用**：采用流式处理和零拷贝引用机制，轻松支持 10GB+ 超大文件。
-   **⚡️ 智能秒传**：默认采用极速抽样 Hash 策略，支持自定义全量 Hash，支持断点续传。
-   **🎨 灵活钩子**：提供全生命周期 Hooks，完全接管 `Init` -> `Hash` -> `Check` -> `Upload` -> `Merge` 流程。

## 📦 安装

```bash
npm install upload-sdk
# or
yarn add upload-sdk
# or
pnpm add upload-sdk
```

## 🔨 快速上手

### 1. 全局配置

推荐在应用根组件（如 `App.tsx`）进行初始化配置。区分开发环境与生产环境的 `serverUrl` 至关重要。

```tsx
import { useEffect } from "react"
import { UploadManager } from "upload-sdk"

const App = () => {
    useEffect(() => {
        const manager = UploadManager.getInstance()
        const isDev = process.env.NODE_ENV === "development"

        manager.setConfig({
            // 开发环境使用当前域 (触发 Proxy)，生产环境使用真实地址
            serverUrl: isDev ? window.location.origin : "https://api.production.com",
            concurrency: 3,

            hooks: {
                // 1. 初始化 (获取 uploadId)
                init: async ctx => {
                    const res = await fetch("/api/init", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: ctx.file?.name,
                            totalChunks: ctx.count
                        })
                    })
                    return (await res.json()).data
                },

                // 2. 上传分片 (返回配置，Worker 自动组装)
                upload: ctx => {
                    return {
                        url: "/api/upload_chunk",
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

                // 3. 合并文件
                merge: ctx => {
                    return {
                        url: "/api/merge",
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
                    {file.status === "error" && <div style={{ color: "red" }}>{file.errorMsg}</div>}
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
| `hooks`              | `Hooks`   | -      | 生命周期钩子 (见下文)。                                                          |
| `preventWindowClose` | `boolean` | `true` | 上传中是否拦截浏览器关闭/刷新。                                                  |

### `Hooks` (核心)

所有 Hooks 均运行在 **主线程**。

#### 通用 Context (`ctx`)

```typescript
interface HookContext {
    file: File // 原始文件对象 (主线程引用，零开销)
    filename: string // 文件名
    count: number // 总切片数 (Worker 预计算)
    chunkSize: number // 切片大小
    initData: any // init 阶段的返回值
    hash?: string // 文件 Hash
    index?: number // 当前切片索引 (仅 upload 阶段)
}
```

#### 1. `init(ctx)`

-   **必需**：是
-   **作用**：任务初始化。必须返回一个 Promise，其解析结果将注入到 `ctx.initData`。
-   **注意**：如果此 Hook 抛出错误，后续 Hash 计算和上传流程将不会执行。

#### 2. `calculateHash(ctx)`

-   **必需**：否
-   **默认值**：抽样 SHA-256 (取头、中、尾各 2MB 计算)。
-   **作用**：自定义 Hash 算法。如果需要全量 MD5，请引入 `hash-wasm` 在此实现。

#### 3. `check(ctx)`

-   **必需**：否
-   **作用**：秒传检查。返回 `RequestOption`。

#### 4. `upload(ctx)`

-   **必需**：是
-   **作用**：构造切片上传请求。
-   **返回值**：`RequestOption` (JSON 配置)。
-   **⚠️ 警告**：不要在此 Hook 中 `new FormData()`，也不要试图访问切片二进制数据。只返回配置，Worker 会负责组装。

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

### Q4: 遇到 `MIME type` 错误或找不到 `worker.js`？

**原因**：这是因为 SDK 使用了 **Inline Worker** 技术。
为了让 SDK "开箱即用"（不需要用户配置构建工具去拷贝 worker 文件），我们在打包时将 Worker 代码编译成字符串内联到了主包中。
**影响**：你不需要做任何配置，也不需要在 `public` 目录下放任何文件。

### Q5: 为什么修改 `worker` 目录下的代码，热更新 (HMR) 有时不生效？

**原因**：这是构建工具 (`tsup`/`esbuild`) 的限制。
由于 Worker 代码被编译成了内联字符串，主构建进程很难追踪到 Worker 内部依赖文件的变动。
**解决**：通常重启开发服务器 (`npm run dev`) 即可解决。这不是运行时 bug，仅影响开发体验。
