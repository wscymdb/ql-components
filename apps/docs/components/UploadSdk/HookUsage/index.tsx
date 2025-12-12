import { Button, message, Upload, UploadProps } from "antd"
import { useEffect, useRef } from "react"
import { useUpload } from "@ql-react-components/upload-sdk"
import { UploadOutlined } from "@ant-design/icons"

const request = (data: any) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data)
        }, 1000)
    })
}

const BigFileUpload = () => {
    const { startUpload } = useUpload()
    const fileListRef = useRef<any[]>([])

    const { setUploadConfig } = useUpload()

    useEffect(() => {
        setUploadConfig({
            serverUrl: "/api",
            hooks: {
                // async init(_ctx) {
                //     const res = await request({
                //         uploadId: "123456"
                //     })
                //     return res
                // },
                upload(ctx) {
                    const { initData } = ctx
                    console.log(initData)
                    return {
                        url: "/api/upload_chunk",
                        method: "POST",
                        body: {
                            name: "zs",
                            age: 18
                        },
                        chunkFieldName: "file"
                    }
                },
                async merge(_ctx) {
                    const _res = await request({
                        uploadId: "123456"
                    })
                    message.success(123)
                    return {
                        url: "/api/upload_chunk",
                        method: "POST",
                        body: {
                            name: "zs",
                            age: 18
                        },
                        chunkFieldName: "file"
                    }
                }
            }
        })
    }, [setUploadConfig])

    const uploadProps: UploadProps = {
        name: "file",
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
