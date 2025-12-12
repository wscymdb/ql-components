---
group:
    title: 基础
    order: 0
title: 快速上手
order: 1
---

## 快速上手

`upload-sdk` 内置了标准的上传流程规范。如果您的后端接口遵循以下**默认规范**，您只需配置服务器地址即可零成本接入。

### 1. 极简配置

只需通过 `setUploadConfig` 配置 `serverUrl` 即可（支持相对路径以适配开发环境 Proxy）。

### 2. 代码示例

<code src="./index.tsx" desc="零配置接入示例"></code>

### 3. 默认接口规范 (开箱即用)

如果不配置 `apiPaths` 和 `hooks`，SDK 将默认向以下地址发送请求：

| 阶段         | 方法   | 默认路径          | 参数/Body                            | 说明                         |
| :----------- | :----- | :---------------- | :----------------------------------- | :--------------------------- |
| **秒传检查** | `GET`  | `/upload_already` | `?HASH=xxx`                          | 根据 Hash 判断文件是否已存在 |
| **切片上传** | `POST` | `/upload_chunk`   | `FormData: { file, filename, hash }` | 这里的 `file` 是二进制切片   |
| **合并文件** | `POST` | `/upload_merge`   | `HASH=xxx&count=10`                  | 通知后端按顺序合并切片       |

> **提示**：如果您的接口路径或参数与上述默认值不同，请参考 [进阶配置](/guide/advanced) 修改 `apiPaths` 或使用 `hooks` 接管。
