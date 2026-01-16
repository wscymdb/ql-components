## 并发控制

SDK 提供了三层并发控制机制,确保在大量文件上传时不会压垮服务器或浏览器:

### 三层并发控制

#### 1. 文件级并发 (`uploadConcurrency`)

控制同时上传的文件数量。

```typescript
initialize({
    serverUrl: "/api",
    uploadConcurrency: 3 // 最多同时上传 3 个文件
})
```

**效果:**

- 上传 200 个文件时,只有 3 个文件会同时进行 init/check/upload/merge 流程
- 其余 197 个文件会在队列中等待(`queued` 状态)
- 每当一个文件完成,队列中的下一个文件自动开始

#### 2. Hash 计算并发 (`hashConcurrency`)

控制同时进行 Hash 计算的文件数量。

```typescript
initialize({
    serverUrl: "/api",
    hashConcurrency: 3 // 最多同时计算 3 个文件的 Hash
})
```

**效果:**

- 预计算 Hash 时,最多同时计算 3 个文件
- 避免浏览器因大量计算而卡顿

#### 3. 切片级并发 (`chunkConcurrency`)

控制单个文件内部同时上传的切片数量。

```typescript
initialize({
    serverUrl: "/api",
    chunkConcurrency: 5 // 每个文件最多同时上传 5 个切片
})
```

**效果:**

- 单个大文件被切成 100 个切片时,最多同时上传 5 个切片
- 避免单个文件占用过多网络连接

### 配置示例

```typescript
const { initialize } = useUpload()

useEffect(() => {
    initialize({
        serverUrl: "/api",
        uploadConcurrency: 3, // 同时上传 3 个文件
        hashConcurrency: 3, // 同时计算 3 个 Hash
        chunkConcurrency: 5 // 每个文件同时上传 5 个切片
    })
}, [])
```

### 动态调整

可以根据网络状况动态调整并发数:

```typescript
const { updateConfig } = useUpload()

// 网络变慢时降低并发
updateConfig({ uploadConcurrency: 2 })

// 网络恢复时提高并发
updateConfig({ uploadConcurrency: 5 })
```

### 最佳实践

| 场景           | uploadConcurrency | hashConcurrency | chunkConcurrency |
| -------------- | ----------------- | --------------- | ---------------- |
| 小文件批量上传 | 5-10              | 5-10            | 3                |
| 大文件上传     | 2-3               | 2-3             | 5-10             |
| 移动端         | 1-2               | 1-2             | 3                |
| 弱网环境       | 1                 | 1               | 2                |

<code src="./index.tsx" desc="并发控制示例"></code>
