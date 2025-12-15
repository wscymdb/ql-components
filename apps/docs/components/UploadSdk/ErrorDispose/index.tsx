import { Button, message, Upload, UploadProps } from "antd"
import { useEffect, useRef } from "react"
import { UploadBatchError, useUpload } from "@ql-react-components/upload-sdk"
import { UploadOutlined } from "@ant-design/icons"

const BigFileUpload = () => {
    const { startUpload } = useUpload()
    const fileListRef = useRef<any[]>([])

    const { setUploadConfig } = useUpload()

    useEffect(() => {
        setUploadConfig({
            serverUrl: "/api",
            hooks: {
                // 【核心技巧】我们在前端模拟后端业务错误
                validateResponse: ({ file }) => {
                    // 模拟：只要文件名包含 "fail"，就抛出业务错误
                    if (file?.name.includes("fail")) {
                        throw new Error("模拟业务错误：文件名包含敏感词")
                    }
                    // 正常文件放行
                },
                // 为了演示方便，我们甚至可以拦截 upload 请求直接返回假成功
                // 这样用户不需要真实的后端也能跑通 Demo
                upload: async () => {
                    // 模拟网络延迟
                    await new Promise(r => setTimeout(r, 500))
                    return {
                        url: "/mock-success",
                        method: "POST"
                    } // 配置无所谓，validateResponse 才是关键
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
        } catch (err) {
            console.log(err)
            // 【关键】捕获部分失败
            if (err instanceof UploadBatchError) {
                const failCount = err.results.filter(
                    r => r.status === "error"
                ).length
                message.error(
                    `上传完成，但在 ${err.results.length} 个文件中失败了 ${failCount} 个`
                )

                // 注意：这里不要清空 fileList 或关闭弹窗
                // 应该保留 UI 让用户看到具体是哪个红了
            } else {
                console.error(err)
                message.error("发生了未知系统错误")
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
        </div>
    )
}

export default BigFileUpload
