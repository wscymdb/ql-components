import { Button, Card, message, Progress, Upload, UploadProps, Tag, Space, Alert } from "antd"
import { useEffect, useState } from "react"
import { UploadBatchError, useUpload } from "@ql-frontend/upload-sdk" // 替换为你的包名
import { UploadOutlined, FileOutlined, StopOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons"
import type { UploadFile } from "antd/es/upload/interface"

const CancelDemo = () => {
    // 1. 获取核心方法
    const {
        uploadMap,
        cancelUpload,
        removeFile, // 用于彻底删除
        setup,
        startUpload
    } = useUpload()

    const [fileList, setFileList] = useState<UploadFile[]>([])

    useEffect(() => {
        setup({
            serverUrl: "/api",
            // 模拟配置：故意让上传变慢，方便演示取消
            hooks: {
                upload: async () => {
                    // 模拟网络延迟 800ms
                    await new Promise(r => setTimeout(r, 800))
                    return { url: "/mock-upload", method: "POST" }
                }
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // 只在组件挂载时执行一次

    const uploadProps: UploadProps = {
        name: "file",
        multiple: true,
        fileList,
        beforeUpload: () => false,
        onChange: ({ fileList }) => setFileList(fileList),
        onRemove: () => false
    }

    const handleUpload = async (filesToUpload?: UploadFile[]) => {
        const currentList = Array.isArray(filesToUpload) ? filesToUpload : fileList

        try {
            await startUpload(currentList)
            message.success("所有任务处理完毕")
        } catch (err: any) {
            // 处理批量结果
            if (err instanceof UploadBatchError) {
                const cancelled = err.results.filter(r => r.status === "cancelled")

                // 如果有被取消的任务，提示一下（可选）
                if (cancelled.length > 0) {
                    message.info(`已取消 ${cancelled.length} 个任务`)
                }
            } else if (err.message === "Task is already running") {
                // 忽略重复点击
            } else {
                message.error("发生异常")
            }
        }
    }

    // 单个文件重试逻辑
    const handleRetry = (file: UploadFile) => {
        handleUpload([file])
    }

    return (
        <div className="big-file-upload" style={{ padding: 20 }}>
            <Alert
                title="交互指南"
                description="上传已被模拟为慢速模式。请在进度条走动时尝试点击“取消”或“移除”。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 20 }}>
                <Space>
                    <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />}>选择文件</Button>
                    </Upload>
                    <Button type="primary" onClick={() => handleUpload()} disabled={fileList.length === 0}>
                        全部开始
                    </Button>
                </Space>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.values(uploadMap).map(item => {
                    // 判断是否处于"活跃/进行中"状态
                    const isRunning = ["calculating", "checking", "uploading", "ready"].includes(item.status)

                    return (
                        <Card key={item.uid} size="small" bodyStyle={{ padding: 12 }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 8
                                }}
                            >
                                <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                                    <FileOutlined />
                                    <span
                                        style={{
                                            maxWidth: 180,
                                            overflow: "hidden",
                                            whiteSpace: "nowrap",
                                            textOverflow: "ellipsis"
                                        }}
                                    >
                                        {item.name}
                                    </span>
                                </div>

                                {/* 状态展示 */}
                                <div>
                                    {item.status === "cancelled" && (
                                        <Tag icon={<StopOutlined />} color="default">
                                            已取消
                                        </Tag>
                                    )}
                                    {item.status === "done" && <Tag color="success">完成</Tag>}
                                    {item.status === "error" && <Tag color="error">失败</Tag>}
                                    {isRunning && <Tag color="processing">处理中</Tag>}
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <div style={{ flex: 1 }}>
                                    <Progress
                                        percent={item.progress}
                                        // 这里的 status 控制进度条颜色
                                        status={
                                            item.status === "cancelled"
                                                ? "normal"
                                                : item.status === "error"
                                                  ? "exception"
                                                  : "active"
                                        }
                                        strokeColor={item.status === "cancelled" ? "#d9d9d9" : undefined}
                                    />
                                </div>

                                <Space>
                                    {/* 1. 取消按钮：仅在运行时显示 */}
                                    {isRunning && (
                                        <Button
                                            size="small"
                                            type="text"
                                            danger
                                            icon={<StopOutlined />}
                                            onClick={() => cancelUpload(item.uid)}
                                        >
                                            取消
                                        </Button>
                                    )}

                                    {/* 2. 重试按钮：仅在取消或失败后显示 */}
                                    {(item.status === "cancelled" || item.status === "error") && (
                                        <Button
                                            size="small"
                                            type="link"
                                            icon={<ReloadOutlined />}
                                            onClick={() => {
                                                // 需要找到原始 File 对象进行重试
                                                const file = fileList.find(f => f.uid === item.uid)
                                                if (file) handleRetry(file)
                                            }}
                                        >
                                            重试
                                        </Button>
                                    )}

                                    {/* 3. 移除按钮：随时显示 (或者仅在非运行时显示) */}
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        onClick={() => {
                                            removeFile(item.uid)
                                            // 同时同步移除 React 状态里的文件（可选）
                                            setFileList(prev => prev.filter(f => f.uid !== item.uid))
                                        }}
                                    />
                                </Space>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

export default CancelDemo
