import type { FC } from "react"
import { Form, message, Modal } from "antd"
import CustomUpload from "../Fieldupload"
import { UploadBatchError, useUpload } from "@ql-react-components/upload-sdk"

interface AddModalProps {
    onClose: (refresh?: boolean) => void
    title?: string
}

const AddModal: FC<AddModalProps> = props => {
    const { onClose, title = "标题" } = props
    const { startUpload } = useUpload()

    const [form] = Form.useForm()

    const onFinish = async (formData: Record<string, any>) => {
        try {
            console.log(formData, "formData")

            const res = await startUpload(formData.files)
            console.log(res, "res")
            onClose(true)
        } catch (err) {
            // 【修改】类型安全地捕获
            if (err instanceof UploadBatchError) {
                console.log("完整结果单:", err.results)

                const failCount = err.results.filter(
                    r => r.status === "error"
                ).length
                message.error(`失败了 ${failCount} 个文件`)
            } else {
                console.error("发生了未知错误:", err)
            }
        }
    }

    return (
        <Modal
            title={title}
            forceRender
            open={true}
            onOk={form.submit}
            onCancel={() => onClose()}
        >
            <Form
                onFinish={onFinish}
                form={form}
                layout="vertical"
                name="batch_set_form"
            >
                <Form.Item name="files" label="文件">
                    {/* @ts-expect-error 后面会改正 */}
                    <CustomUpload />
                </Form.Item>
            </Form>
        </Modal>
    )
}

export default AddModal
