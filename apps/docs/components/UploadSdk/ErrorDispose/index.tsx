import { Button, message, Upload, UploadProps, Card, Tag, Alert, Progress } from "antd"
import { useEffect, useState } from "react"
import { UploadBatchError, useUpload } from "@ql-react-components/upload-sdk"
import { UploadOutlined, FileOutlined, CloseCircleOutlined } from "@ant-design/icons"
import type { UploadFile } from "antd/es/upload/interface"

const ErrorHandleDemo = () => {
    // 1. 记得解构出 uploadMap 以展示 UI
    const { startUpload, setup, uploadMap } = useUpload()
    const [fileList, setFileList] = useState<UploadFile[]>([])

    useEffect(() => {
        setup({
            serverUrl: "/api",
            hooks: {
                // 前端模拟业务错误拦截
                validateResponse: ctx => {
                    // 模拟：只要文件名包含 "fail"，就视为业务失败
                    if (ctx.file?.name.includes("fail")) {
                        // ✅ 使用 fail 方法优雅中断
                        ctx.fail("模拟业务错误：文件名包含敏感词 'fail'")
                    }
                },
                // 模拟上传请求
                upload: async () => {
                    await new Promise(r => setTimeout(r, 600))
                    return { url: "/mock-success", method: "POST" }
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
        showUploadList: false // 我们自己渲染 Card
    }

    const handleUpload = async () => {
        if (fileList.length === 0) return message.warning("请选择文件")

        try {
            await startUpload(fileList.map(f => f.originFileObj))
            message.success("太棒了，所有文件上传成功！")
        } catch (err) {
            // 【关键】捕获部分失败
            if (err instanceof UploadBatchError) {
                const failCount = err.results.filter(r => r.status === "error").length
                message.error(`上传结束，有 ${failCount} 个文件失败，请检查列表`)

                // 注意：报错后不要清空列表，保留 UI 让用户看到错误原因
            } else {
                console.error(err)
                message.error("发生了未知系统错误")
            }
        }
    }

    return (
        <div className="big-file-upload" style={{ padding: 20 }}>
            <Alert
                title="测试指南"
                description="请尝试上传两个文件：一个正常命名，另一个改名为 'fail.txt'，观察部分失败的处理效果。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>选择多个文件</Button>
                </Upload>
                <Button
                    type="primary"
                    style={{ marginLeft: 16 }}
                    onClick={handleUpload}
                    disabled={fileList.length === 0}
                >
                    触发上传
                </Button>
            </div>

            {/* 渲染进度列表，展示错误状态 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.values(uploadMap).map(item => (
                    <Card key={item.uid} size="small" bodyStyle={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <FileOutlined />
                                <span style={{ fontWeight: 500 }}>{item.name}</span>
                            </div>
                            <div>
                                {item.status === "error" && <Tag color="error">失败</Tag>}
                                {item.status === "done" && <Tag color="success">成功</Tag>}
                                {item.status === "uploading" && <Tag color="blue">上传中</Tag>}
                            </div>
                        </div>

                        <Progress
                            percent={item.progress}
                            status={item.status === "error" ? "exception" : "active"}
                            showInfo={false}
                        />

                        {/* 红色错误提示 */}
                        {item.status === "error" && (
                            <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                                <CloseCircleOutlined /> 失败原因: {item.errorMsg}
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default ErrorHandleDemo
