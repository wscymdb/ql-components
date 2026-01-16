import { Button, message, Upload, UploadProps } from "antd"
import { useEffect, useRef } from "react"
import { useUpload } from "@ql-react-components/upload-sdk"
import { UploadOutlined } from "@ant-design/icons"

/**
 * eslint-disable-next-line react-hooks/exhaustive-deps 是一个 ESLint 注释指令，用于临时禁用下一行代码的特定 ESLint 规则检查。
 *
 * - eslint-disable-next-line：告诉 ESLint "禁用下一行代码的规则检查"
 * - react-hooks/exhaustive-deps：指定要禁用的具体规则名称，这里是 React Hooks 的 exhaustive-deps 规则
 */

const BigFileUpload = () => {
    const { startUpload, initialize } = useUpload()
    const fileListRef = useRef<any[]>([])

    useEffect(() => {
        initialize({
            serverUrl: "/api"
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // 只在组件挂载时执行一次

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
