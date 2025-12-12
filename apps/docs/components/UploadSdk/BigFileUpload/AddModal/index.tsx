import type { FC } from "react"
import { Form, Modal } from "antd"
import CustomUpload from "../Fieldupload"
import { useUpload } from "@ql-react-components/upload-sdk"

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

            startUpload(formData.files)
            onClose(true)
        } catch (info) {
            console.log("Validate Failed:", info)
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
