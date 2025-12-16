import { Button, Card, message, Progress, Upload, UploadProps } from "antd"
import { useEffect, useRef } from "react"
import { UploadBatchError, useUpload } from "@ql-react-components/upload-sdk"
import { UploadOutlined } from "@ant-design/icons"

const BigFileUpload = () => {
    const { uploadMap, cancelUpload, setUploadConfig, startUpload } =
        useUpload()
    const fileListRef = useRef<any[]>([])

    useEffect(() => {
        setUploadConfig({
            showLog: true,
            serverUrl: "/api"
        })
    }, [setUploadConfig])

    const uploadProps: UploadProps = {
        name: "file",
        multiple: true,
        beforeUpload: () => false,
        onChange: ({ fileList }) => {
            fileListRef.current = fileList
        }
    }

    const handleUpload = async () => {
        try {
            const fileList = fileListRef.current
            if (fileList.length === 0) {
                return message.warning("请选择文件后再上传")
            }

            await startUpload(fileList)
            message.success("上传成功")
        } catch (err) {
            if (err instanceof UploadBatchError) {
                const cancelled = err.results.filter(
                    r => r.status === "cancelled"
                )

                const cancelNames = cancelled.map(r => r.file.name)
                message.warning(`取消上传文件: ${cancelNames.join(", ")}`)
                console.log("捕获到取消:", cancelled)
            }
        }
    }

    return (
        <div className="big-file-upload">
            <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} type="primary">
                    上传文件到浏览器
                </Button>
            </Upload>

            <Button style={{ marginTop: 10 }} onClick={handleUpload}>
                开始切片上传到服务器
            </Button>

            {Object.values(uploadMap).map(item => (
                <Card key={item.uid}>
                    <div className="status-text">
                        {item.status === "calculating" &&
                            `🔍 校验中 ${item.progress}%`}
                        {item.status === "uploading" &&
                            `🚀 上传中 ${item.progress}%`}
                        {item.status === "done" && `✅ 完成`}
                    </div>
                    <Progress percent={item.progress} />
                    {/* 只在计算或上传中显示取消按钮 */}
                    {(item.status === "calculating" ||
                        item.status === "uploading") && (
                        <Button onClick={() => cancelUpload(item.uid)}>
                            取消
                        </Button>
                    )}
                </Card>
            ))}
        </div>
    )
}

export default BigFileUpload
