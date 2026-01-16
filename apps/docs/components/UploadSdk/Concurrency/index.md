## 并发请求

某些情况下内置的两个请求可能无法满足需求，我们提供了内置的 hooks，用于自定义上传请求
。

目前一共提供了 3 个请求相关的 hook：

- `init`：初始化上传配置 非必填项。
    - 返回的内容会在`upload`和`merge`的`ctx.initData`中展示。
- `upload`：用于获取上传配置 必填项。
- `merge`：用于合并上传文件 非必填项。

**每个 hook 都有一个 ctx 参数，用于传递上下文信息。详情参考下方文档**

- upload 和 merge 这两个 hook 我们内置了 fetch 请求，所以只需要返回请求的配置即可
    - 在 upload 中，是拿不到当前的切片的（原因见 FAQ），我们内置处理了切片的上传

<code src="./index.tsx"  desc="hooks的使用"></code>
