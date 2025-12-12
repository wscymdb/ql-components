# @ql-react-components/upload-sdk

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
