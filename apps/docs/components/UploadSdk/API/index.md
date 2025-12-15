## API 参考

这里列出了 SDK 所有的接口定义、配置参数及类型说明。

### useUpload

React 核心 Hook，用于获取上传状态和控制方法。

```tsx | pure
const { startUpload, setUploadConfig, uploadMap } = useUpload()
```

#### 返回值

| 属性              | 说明                                                                            | 类型                                                                 |
| :---------------- | :------------------------------------------------------------------------------ | :------------------------------------------------------------------- |
| `startUpload`     | 触发上传的核心方法。支持多文件并发，返回 Promise，需通过 `try/catch` 捕获结果。 | `(files: File[], options?: UploadConfig) => Promise<UploadResult[]>` |
| `setUploadConfig` | 全局设置 SDK 配置（单例模式，全局生效）。                                       | `(config: UploadConfig) => void`                                     |
| `uploadMap`       | 当前所有文件的上传状态快照。Key 为文件 `uid`。                                  | `Record<string, SingleFileState>`                                    |
| `getFileState`    | 获取指定 UID 文件的状态（安全访问，若不存在返回默认空状态）。                   | `(uid: string) => SingleFileState`                                   |

### UploadConfig

全局配置对象，用于 `setUploadConfig` 或 `startUpload` 的第二个参数。

| 属性                 | 说明                                                                        | 类型          | 是否必填 | 默认值                                               |
| :------------------- | :-------------------------------------------------------------------------- | :------------ | :------- | :--------------------------------------------------- |
| `serverUrl`          | 服务器基础地址。支持相对路径（如 `/api`）以适配 Proxy。                     | `string`      | 是       | -                                                    |
| `apiPaths`           | 自定义各阶段的接口路径。                                                    | `ApiPaths`    | 否       | `{upload: '/upload_chunk', merge: '/upload_merge' }` |
| `concurrency`        | 并发上传的切片数量。不建议设置过大，以免阻塞浏览器。                        | `number`      | 否       | `3`                                                  |
| `chunkSize`          | 单个切片的大小（字节）。                                                    | `number`      | 否       | `5 * 1024 * 1024` (5MB)                              |
| `checkEnabled`       | 是否开启秒传/断点续传检查。                                                 | `boolean`     | 否       | `true`                                               |
| `preventWindowClose` | 上传过程中是否拦截浏览器关闭/刷新。                                         | `boolean`     | 否       | `true`                                               |
| `token`              | 如果需要，SDK 会自动将其添加到请求头的 `Authorization: Bearer {token}` 中。 | `string`      | 否       | -                                                    |
| `hooks`              | 生命周期钩子函数集合。                                                      | `UploadHooks` | 否       | -                                                    |

#### ApiPaths

```typescript | pure
interface ApiPaths {
    upload?: string // 切片上传接口
    merge?: string // 合并文件接口
}
```

### Lifecycle Hooks

通过 `config.hooks` 定义的生命周期函数，用于接管上传流程。所有 Hook 均运行在 **主线程**，支持 `async/await`。

| 钩子名称           | 说明                                                                                                      | 类型                                                            |
| :----------------- | :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `init`             | **初始化阶段**。在 Hash 计算完成后执行。请求完全由主线程控制，**请在此函数内部自行校验结果**。            | `(ctx: HookContext) => Promise<any> \| any`                     |
| `validateResponse` | **响应校验**。仅在 Worker 发起的请求阶段 (**Upload / Merge**) 触发。用于拦截业务错误（如 `code !== 0`）。 | `(ctx: HookContext) => void`                                    |
| `upload`           | **切片上传**。返回切片上传请求的配置。                                                                    | `(ctx: HookContext) => Promise<RequestOption> \| RequestOption` |
| `merge`            | **合并文件**。返回合并请求的配置。                                                                        | `(ctx: HookContext) => Promise<RequestOption> \| RequestOption` |

#### HookContext

传递给所有 Hook 的上下文对象。

| 属性        | 说明                      | 类型                             | 备注                           |
| :---------- | :------------------------ | :------------------------------- | :----------------------------- |
| `file`      | 原始文件对象              | `File`                           | -                              |
| `filename`  | 文件名                    | `string`                         | -                              |
| `hash`      | 文件 Hash 值              | `string`                         | SHA-256                        |
| `count`     | 总切片数量                | `number`                         | -                              |
| `chunkSize` | 切片大小                  | `number`                         | -                              |
| `initData`  | `init` 钩子的返回值       | `any`                            | 仅在后续阶段可用               |
| `index`     | 当前切片索引（从 1 开始） | `number`                         | 仅 `upload` 阶段可用           |
| `response`  | 后端接口返回的原始数据    | `any`                            | 仅 `validateResponse` 阶段可用 |
| `hookName`  | 当前触发的阶段名称        | `'check' \| 'upload' \| 'merge'` | 仅 `validateResponse` 阶段可用 |

#### RequestOption

`upload` / `merge` 钩子必须返回的配置对象。

| 属性             | 说明                                                                               | 是否必须 | 默认值 | 类型                              |
| :--------------- | :--------------------------------------------------------------------------------- | :------- | :----- | :-------------------------------- |
| `url`            | 请求地址（支持相对路径）。                                                         | 是       | -      | `string`                          |
| `method`         | 请求方法。                                                                         | 是       | post   | `'GET' \| 'POST' \| 'PUT'`        |
| `headers`        | 自定义请求头。                                                                     | 否       | -      | `Record<string, string>`          |
| `body`           | 请求体参数。如果是对象，SDK 会自动处理；如果是 upload 阶段，SDK 会将其与切片合并。 | 否       | -      | `Record<string, any> \| BodyInit` |
| `chunkFieldName` | **[仅 upload]** 告诉 Worker 将二进制切片 append 到 FormData 时的字段名。           | 否       | file   | `string`                          |

### 数据结构与错误

#### SingleFileState

`uploadMap` 中每个文件的状态对象。

| 属性       | 说明                                                                        | 类型                                         |
| :--------- | :-------------------------------------------------------------------------- | :------------------------------------------- |
| `uid`      | 文件唯一标识                                                                | `string`                                     |
| `status`   | 当前状态                                                                    | `'idle' \| 'uploading' \| 'done' \| 'error'` |
| `progress` | 进度百分比 (0-100)，这里的进度是纯前端的进度，公式：`总切片数/成功的切片数` | `number`                                     |
| `hash`     | 文件 Hash (完成或计算后存在)                                                | `string`                                     |
| `errorMsg` | 错误信息 (状态为 error 时存在)                                              | `string`                                     |

#### UploadBatchError

当 `startUpload` 抛出错误时捕获到的对象。

| 属性      | 说明                               | 类型             |
| :-------- | :--------------------------------- | :--------------- |
| `message` | 错误摘要                           | `string`         |
| `results` | 完整的结果列表（包含成功和失败项） | `UploadResult[]` |

#### UploadResult

`UploadBatchError['results']` 数组中的单项结构。

```typescript | pure
type UploadResult =
    // 成功状态
    | {
          status: "success"
          uid: string
          file: File
          hash: string
      }
    // 失败状态
    | {
          status: "error"
          uid: string
          file: File
          error: Error
      }
```
