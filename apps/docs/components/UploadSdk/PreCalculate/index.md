### 预计算 Hash

默认情况下，`upload-sdk` 会在调用 `startUpload` 的时候才开始计算文件的 Hash 值。

但是这会造成一个问题，如果上传的文件过大会导致计算 hash 的时间过长，影响用户体验。
为了解决这个问题，`upload-sdk` 提供了 `preCalculate` 方法，用户可以在调用 `startUpload` 之前调用 `preCalculate` 方法预计算文件的 Hash 值。

<code src="./index.tsx" desc="零配置接入示例"></code>
