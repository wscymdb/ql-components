---
nav: Upload SDK
title: 介绍和安装
order: 0
toc: content
---

# upload-sdk

一个基于 **Web Worker** 和 **RPC (远程过程调用)** 架构的高性能大文件切片上传 SDK。

它将繁重的计算（Hash 计算）和 I/O 操作（并发请求）完全隔离在 Worker 线程中，确保主线程 UI **零卡顿**。同时，独创的 RPC 机制让开发者能在 React 组件中通过 Hooks 完全接管上传的每一个生命周期。

## ✨ 特性

- **🚀 极致性能**：采用 **Off-Main-Thread** 架构，Hash 计算、切片处理、网络请求全量移交 Web Worker，彻底告别页面假死。
- **🔗 RPC 驱动**：逻辑定义在主线程（可无缝访问组件 State/Store/Router），具体执行在 Worker 线程，兼顾灵活性与性能。
- **💾 内存友好**：基于流式处理（Stream）和零拷贝引用机制，稳定支持 **10GB+** 超大文件上传，拒绝浏览器崩溃。
- **⚡️ 高效并发**：内置智能并发控制队列，自动管理切片上传顺序与重试机制，最大化利用网络带宽。
- **🛡️ 业务级风控**：新增 `validateResponse` 钩子，支持细粒度的业务逻辑校验（如拦截 Token 过期、权限不足），将 HTTP 200 中的业务错误通过标准 Error 抛出。
- **🎨 全链路 Hooks**：提供完善的生命周期钩子，执行流为 `Hash` -> `Init` -> `Check` -> `Upload` -> `Merge`，支持异步 `await` 阻塞控制。

## 📦 安装

:::code-group

```bash [npm]
npm i @ql-frontend/upload-sdk@latest
```

```bash [pnpm]
pnpm add @ql-frontend/upload-sdk@latest
```

```txt [other]
其余工具我没尝试 理论上都是支持的
```

:::

<br />

:::warning
**⚠️ 关于配置的最佳实践**
本 SDK 采用 **单例模式** + **分层配置快照** 管理状态。

- **配置管理**: 使用 `setup()` 方法配置上传管理器。第一次调用时会完整初始化所有配置（必须设置 `serverUrl`），后续调用可以更新所有配置。
- **分层配置**:
    - **全局配置**（`token`、`serverUrl` 等）：更新后所有任务立即生效
    - **任务配置**（`hooks`、`apiPaths`）：只对新创建的任务生效，队列中的任务使用创建时的快照
- **单文件配置**: 如果某个文件需要特殊处理，可以在上传时传入 `options`：`await startUpload(file, { hooks: {...}, apiPaths: {...} })`

详细说明请查看 [分层配置快照](/upload/layered-config) 文档。

:::

<!-- ## 快速上手 -->

<!-- <embed src="../../components/UploadSdk/Quickly/index.md"></embed> -->

<!-- ## 自定义接口路径

<embed src="../../components/UploadSdk/ApiPaths/index.md"></embed> -->

<!-- hook的使用 -->

<!-- <embed src="../../components/UploadSdk/CustomRequest/index.md"></embed> -->

<!-- 错误处理 -->

<!-- <embed src="../../components/UploadSdk/ErrorDispose/index.md"></embed> -->

<!-- 预计算 Hash -->

<!-- <embed src="../../components/UploadSdk/PreCalculate/index.md"></embed> -->

<!-- 取消上传 -->

<!-- <embed src="../../components/UploadSdk/CancelUpload/index.md"></embed> -->

<!-- API 接口 -->

<!-- <embed src="../../components/UploadSdk/API/index.md"></embed> -->

<!-- FAQ -->

<!-- <embed src="../../components/UploadSdk/FAQ/index.md"></embed> -->
