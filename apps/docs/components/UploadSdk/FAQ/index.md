## FAQ

### 什么是 "Off-Main-Thread" (脱离主线程) 架构？为什么它很重要？

在传统的浏览器环境中，JavaScript 是单线程运行的（Main Thread）。这意味着 UI 渲染、用户点击响应、以及代码逻辑都在同一个线程排队执行。

-   **传统痛点**：如果你尝试在主线程计算一个 5GB 文件的 MD5 Hash，或者并发处理大量切片逻辑，主线程会被长时间占用（Blocking），导致页面**假死、卡顿、动画掉帧**，用户无法进行任何操作。
-   **本 SDK 的解法**：我们将所有的“脏活累活”（Hash 计算、文件切片、并发网络请求、状态管理）全部移交给了后台的 **Web Worker** 线程执行。
-   **收益**：无论文件多大、上传任务多繁重，您的 React/Vue 页面（主线程）始终保持 **60FPS 流畅响应**。

### 这里的 RPC (远程过程调用) 是指什么？解决了什么问题？

Web Worker 虽然强大，但它在一个隔离的沙箱中运行，**无法访问**主线程的 Context（如 DOM、LocalStorage、Redux/Vuex Store、Router 等）。

这就带来了一个矛盾：**Worker 负责干活（发请求），但主线程才知道该怎么干（比如 Token 存在哪、接口地址是什么）。**

为了解决这个问题，我们设计了一套轻量级的 **RPC 机制**：

1.  **定义在主线程**：您在组件里编写 Hooks（如 `upload`），这里可以随意访问 `props`、`state` 或 `store`。
2.  **执行在 Worker**：当 Worker 需要发请求时，它通过 RPC **“远程呼叫”** 主线程执行这个 Hook。
3.  **结果回传**：主线程执行完 Hook 后，将生成的配置（如 URL、Headers）返回给 Worker，Worker 再根据配置发起真正的网络请求。

**总结**：RPC 让您既享受了 Worker 的高性能，又保留了在组件内编写业务逻辑的灵活性，无需手动处理复杂的 `postMessage` 通信。

### 为什么 `upload` Hook 里拿不到 `ctx.chunk` (切片二进制)？

**设计决策**：为了极致性能。
切片 (`Blob`) 是在 Worker 线程生成的。如果 SDK 将每个切片通过 RPC 传回主线程给 Hook 使用，会导致频繁的线程间通信和数据序列化（结构化克隆），严重拖慢上传速度。
**模式**：我们采用了 **"配置生成器"** 模式。主线程只负责生成 JSON 配置（URL、参数），Worker 在另一端负责将配置与它持有的 `chunk` 进行物理组装和发送。

### 传递 `File` 对象给 Worker 或 Hook 会导致内存暴涨吗？

**不会。**

-   **主线程 Hook**：`ctx.file` 是通过引用传递的，不涉及拷贝，耗时 0ms。
-   **Worker 通信**：浏览器底层对 `File` 和 `Blob` 进行了特殊优化（Disk-Backed Objects）。通过 `postMessage` 传递 10GB 的文件给 Worker，实际上只传递了一个文件句柄（Metadata），不会读取文件内容，也是瞬间完成的。

### 如何自定义 Hash 算法？

SDK 默认使用流式 SHA-256 计算 Hash。目前为了性能和稳定性，移除了主线程自定义 Hash 的 Hook。
如果确实需要更改算法（如 MD5），建议 Clone 源码修改 `worker/worker.utils.ts` 中的 `calculateFileHash` 函数，或者在 `init` 钩子中传入预先计算好的 Hash（如果业务允许）。
