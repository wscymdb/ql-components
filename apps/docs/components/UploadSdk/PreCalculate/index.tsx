import {
    Button,
    Card,
    message,
    Progress,
    Upload,
    UploadProps,
    Alert,
    Flex
} from "antd"
import { useEffect, useState, useMemo } from "react"
import { useUpload, UploadBatchError } from "@ql-react-components/upload-sdk"
import {
    UploadOutlined,
    FileOutlined,
    CloseCircleOutlined
} from "@ant-design/icons"
import type { UploadFile } from "antd/es/upload/interface"

const BigFileUpload = () => {
    const { uploadMap, setUploadConfig, preCalculate, startUpload } =
        useUpload()

    // 使用 useState 代替 useRef，确保 fileList 变化时触发重新渲染
    const [fileList, setFileList] = useState<UploadFile[]>([])

    useEffect(() => {
        setUploadConfig({
            showLog: true,
            serverUrl: "/api"
        })
    }, [setUploadConfig])

    // 计算当前是否正在处理中 (计算中 或 上传中)
    const isProcessing = useMemo(() => {
        return Object.values(uploadMap).some(
            item => item.status === "calculating" || item.status === "uploading"
        )
    }, [uploadMap])

    const uploadProps: UploadProps = {
        name: "file",
        multiple: true,
        beforeUpload: () => false,
        onChange: ({ fileList: newFileList }) => {
            setFileList(newFileList)
            // 触发预计算 (内部会自动去重，不会重复算)
            preCalculate(newFileList)
        }
    }

    const handleUpload = async () => {
        if (fileList.length === 0) {
            return message.warning("请选择文件后再上传")
        }

        try {
            // 这里传入 originFileObj 数组
            await startUpload(fileList.map(f => f.originFileObj))
            message.success("所有文件上传成功")
            // 成功后可以清空列表
            // setFileList([])
        } catch (err) {
            // 捕获 UploadBatchError，判断是全部失败还是部分失败
            if (err instanceof UploadBatchError) {
                const fails = err.results.filter(r => r.status === "error")
                message.error(
                    `有 ${fails.length} 个文件上传失败，请查看列表详情`
                )
            } else {
                message.error("上传发生未知错误")
                console.error(err)
            }
        }
    }

    return (
        <div className="big-file-upload" style={{ padding: 20 }}>
            <Alert
                title="提示：选择文件后会自动进行 Hash 预计算，计算失败可直接点击上传重试"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <Upload {...uploadProps} showUploadList={false}>
                    <Button icon={<UploadOutlined />}>选择文件</Button>
                </Upload>

                <Button
                    type="primary"
                    onClick={handleUpload}
                    disabled={fileList.length === 0 || isProcessing}
                    loading={isProcessing}
                >
                    {isProcessing ? "处理中..." : "开始切片上传"}
                </Button>
            </div>

            <Flex vertical style={{ gap: 12 }}>
                {Object.values(uploadMap).map(item => (
                    <Card key={item.uid} size="small">
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6
                            }}
                        >
                            <div style={{ fontWeight: "bold" }}>
                                <FileOutlined /> 文件ID: {item.uid}
                            </div>
                            <div style={{ fontSize: 12 }}>
                                {item.status === "calculating" && (
                                    <span style={{ color: "#faad14" }}>
                                        🔍 特征计算中...
                                    </span>
                                )}
                                {item.status === "uploading" && (
                                    <span style={{ color: "#1890ff" }}>
                                        🚀 上传中...
                                    </span>
                                )}
                                {item.status === "done" && (
                                    <span style={{ color: "#52c41a" }}>
                                        ✅ 完成
                                    </span>
                                )}
                                {item.status === "error" && (
                                    <span style={{ color: "#ff4d4f" }}>
                                        ❌ 失败
                                    </span>
                                )}
                            </div>
                        </div>

                        <Progress
                            percent={item.progress}
                            status={
                                item.status === "error"
                                    ? "exception"
                                    : item.status === "done"
                                    ? "success"
                                    : "active"
                            }
                            strokeColor={
                                item.status === "calculating"
                                    ? "#faad14"
                                    : undefined
                            }
                        />

                        {/* 重点：展示错误原因 */}
                        {item.status === "error" && (
                            <div
                                style={{
                                    color: "#ff4d4f",
                                    fontSize: 12,
                                    marginTop: 6,
                                    display: "flex",
                                    alignItems: "center"
                                }}
                            >
                                <CloseCircleOutlined
                                    style={{ marginRight: 4 }}
                                />
                                失败原因: {item.errorMsg || "未知错误"}
                            </div>
                        )}
                    </Card>
                ))}
            </Flex>
        </div>
    )
}

export default BigFileUpload
