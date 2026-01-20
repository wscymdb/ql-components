import { Button, message, Upload, UploadProps, Alert } from "antd"
import { useEffect, useState, useMemo } from "react"
import { useUpload } from "@ql-frontend/upload-sdk"
import { UploadOutlined } from "@ant-design/icons"

const BigFileUpload = () => {
    const [fileList, setFileList] = useState<any[]>([])
    const { uploadMap, setup, preCalculate, startUpload } = useUpload()

    useEffect(() => {
        console.log(uploadMap)
    }, [uploadMap])

    useEffect(() => {
        setup({
            showLog: true,
            serverUrl: "/api"
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // 只在组件挂载时执行一次

    // 计算当前是否正在处理中 (计算中 或 上传中)
    const isProcessing = useMemo(() => {
        return Object.values(uploadMap).some(item => item.status === "calculating" || item.status === "uploading")
    }, [uploadMap])

    const computedFileList = useMemo(() => {
        if (!Array.isArray(fileList)) return []

        return fileList.map(item => {
            const current = uploadMap[item.uid]

            return {
                ...item,
                status: current.status === "calculating" ? "uploading" : "done",
                percent: current.progress
            }
        })
    }, [fileList, uploadMap])

    const uploadProps: UploadProps = {
        name: "file",
        multiple: true,
        fileList: computedFileList,
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
            await startUpload(fileList)
            message.success("所有文件上传成功")
        } catch {
            message.error("上传发生未知错误")
        }
    }

    return (
        <div className="big-file-upload" style={{ padding: 20 }}>
            <Alert
                title="选择文件后会立马计算hash，你会在fileList中看到进度，demo中结合了antd的upload组件的fileList实现的"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <div
                style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 20
                }}
            >
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>选择文件</Button>
                </Upload>

                <Button
                    type="primary"
                    onClick={handleUpload}
                    disabled={fileList.length === 0 || isProcessing}
                    loading={isProcessing}
                >
                    上传到服务器
                </Button>
            </div>
        </div>
    )
}

export default BigFileUpload
