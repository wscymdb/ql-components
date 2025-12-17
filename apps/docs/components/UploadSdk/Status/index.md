# UI 状态展示

SDK 的核心状态流转设计得非常细腻，旨在让用户感知到文件处理的每一个微小步骤。本章将展示所有可能出现的 `status` 及其含义，并提供 UI 设计建议。

## 状态字典

`SingleFileState.status` 包含以下枚举值：

| 状态              | 含义   | 触发时机                                | 推荐 UI 表现                                                 |
| :---------------- | :----- | :-------------------------------------- | :----------------------------------------------------------- |
| **`idle`**        | 等待中 | 文件刚被选择，尚未触发计算或上传。      | <span style="color: #999">灰色文本 / 等待</span>             |
| **`calculating`** | 计算中 | 正在计算文件 Hash（预计算或上传前）。   | <span style="color: #faad14">黄色进度条 / 🔍 校验中</span>   |
| **`ready`**       | 就绪   | Hash 计算完成，等待上传指令。           | <span style="color: #52c41a">绿色 Tag / ✅ 校验完成</span>   |
| **`checking`**    | 连接中 | 点击上传后，正在进行 Init 和 秒传检测。 | <span style="color: #1890ff">蓝色 Spinner / 📡 连接中</span> |
| **`uploading`**   | 上传中 | 秒传未命中，正在并发传输切片。          | <span style="color: #1890ff">蓝色进度条 / 🚀 上传中</span>   |
| **`done`**        | 完成   | 上传成功（或秒传命中）。                | <span style="color: #52c41a">绿色进度条 / 🎉 成功</span>     |
| **`error`**       | 失败   | 发生业务错误或网络错误。                | <span style="color: #ff4d4f">红色进度条 / ❌ 失败原因</span> |
| **`cancelled`**   | 已取消 | 用户手动调用了 `cancelUpload`。         | <span style="color: #d9d9d9">灰色进度条 / 🚫 已取消</span>   |

## 状态全览示例

下方的 Demo 展示了一个 **“状态画廊”**。它并未进行真实上传，而是手动构造了包含所有状态的 Mock 数据，供您在设计 UI 组件时参考。

<code src="./index.tsx" desc="所有状态的 UI 渲染范本"></code>
