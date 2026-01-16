## 快速上手

`upload-sdk` 内置了标准的上传流程规范。如果您的后端接口遵循以下**默认规范**，您只需配置服务器地址即可零成本接入。

只需通过 `initialize` 配置 `serverUrl` 即可(必须在第一次上传前调用)。[默认接口规范](/upload/api#uploadconfig)(apiPaths字段)

<code src="./index.tsx" desc="零配置接入示例"></code>
