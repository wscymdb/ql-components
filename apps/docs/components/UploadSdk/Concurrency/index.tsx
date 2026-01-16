import { Button, message, Upload, UploadProps } from "antd"
import { useEffect, useRef } from "react"
import { useUpload } from "@ql-react-components/upload-sdk"
import { UploadOutlined } from "@ant-design/icons"

const BigFileUpload = () => {
    const { startUpload } = useUpload()
    const fileListRef = useRef<any[]>([])

    const { setUploadConfig } = useUpload()

    useEffect(() => {
        setUploadConfig({
            serverUrl: "/api1",
            chunkConcurrency: 3,
            hashConcurrency: 3,
            uploadConcurrency: 100,
            hooks: {
                async init(ctx) {
                    const data = await fetch("http://127.0.0.1:8888/lazy", {})
                    const res = await data.json()
                    console.log(res, "res")

                    console.log(ctx, "init")

                    ctx.success()
                }
            }
        })
    }, [setUploadConfig])

    const uploadProps: UploadProps = {
        name: "file",
        directory: true,
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
        } catch {
            message.error("上传失败")
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
        </div>
    )
}

export default BigFileUpload
