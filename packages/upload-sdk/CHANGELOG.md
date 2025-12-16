# @ql-react-components/upload-sdk

## 0.6.0

### Minor Changes

-   sdk 新增 removeFile 方法 用于删除正在上传的任务

## 0.5.0

### Minor Changes

-   添加 reset 方法 重置状态

## 0.4.1

### Patch Changes

-   修复 status 错乱问题 uploadMap 返回文件名

## 0.4.0

### Minor Changes

#### ✨ Features (新特性)

-   Pre-computation (预计算):
    -   新增 preCalculate(files) 方法，允许在文件选择后立即开始计算 Hash。
    -   智能复用: 如果 Hash 已预计算完成，调用 startUpload 时将直接跳过计算阶段，实现“秒传”体验。
    -   无缝衔接: 支持在计算过程中随时点击上传，startUpload 会自动等待正在进行的计算任务完成，避免重复计算。
    -   Hash Progress:
        -   Hash 计算阶段（包括预计算和上传时计算）现在支持进度实时回调。
        -   UI 状态新增 'calculating'，解决了大文件计算 Hash 时进度条卡在 0% 的“假死”现象。
    -   支持取消上传任务
        -   新增 cancelUpload 方法，允许在任何阶段（包括 Hash 计算和上传）中断上传任务。
        -   取消操作会触发 startUpload 的 catch 块，方便业务层统一处理取消逻辑。

## 0.3.2

### Patch Changes

-   README.md 文档迭代

## 0.3.1

### Patch Changes

-   README.md 迭代 添加 CHNAGELOG.md 压缩代码

## 0.3.0

### Minor Changes

#### ✨ Features (新特性)

-   **Async Hooks Support**:
    -   `upload`、`merge`、`check` 钩子现在支持返回 `Promise`。
    -   **场景**: 允许开发者在构造请求配置前执行异步操作（如刷新 Token、获取预签名 URL、埋点上报等）。
    -   示例: `upload: async (ctx) => { await log(); return { url: ... }; }`
-   **New Hook (`validateResponse`)**:
    -   新增 `validateResponse` 钩子，用于拦截 HTTP 200 但业务状态码错误（如 `code !== 0`）的请求。
    -   支持根据 `hookName` 对不同阶段（Check/Upload/Merge）进行差异化处理。
-   **Relative Path Support**:
    -   `serverUrl` 现已完美支持相对路径（如 `/api`）。
    -   SDK 会在主线程自动将其转换为绝对路径后再传给 Worker，从而解决了 Blob Worker 无法解析相对路径的问题，同时完美支持开发环境 Proxy 代理。

#### 🐛 Bug Fixes (修复)

-   **Worker URL Parsing**: 修复了当 `serverUrl` 配置为相对路径时，Worker 内部 `fetch` 报错 `Failed to parse URL` 的问题。

## 0.2.0

### Minor Changes

-   API 变更: useUpload 的 startUpload 方法签名变更。
    -   旧: (files: any[]) => void
    -   新: (files: any[]) => Promise<UploadResult[]

## 0.1.1

### Patch Changes

-   修复 react 版本依赖改为>=18

## 0.1.0

### Minor Changes

-   发布初始版本，大文件上传功能实现切片上传以及其余附加属性
