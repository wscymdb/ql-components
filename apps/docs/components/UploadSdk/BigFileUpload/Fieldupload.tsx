import type { FC } from 'react'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { Upload } from 'antd'

interface IProps {
  value: any[]
  onChange: (value: any[]) => void
}

const { Dragger } = Upload

const CustomUpload: FC<IProps> = (props) => {
  const { value, onChange } = props

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList: value || [],

    beforeUpload: () => false,
    onChange({ fileList }) {
      onChange([...fileList])
    },
    onRemove(file) {
      const uid = file.uid
      const newFileList = value.filter((item) => item.uid !== uid)

      onChange(newFileList)
    },
  }

  return (
    <div>
      <Dragger {...uploadProps} directory={false}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag file to this area to upload
        </p>
        <p className="ant-upload-hint">
          Support for a single or bulk upload. Strictly prohibited from
          uploading company data or other banned files.
        </p>
      </Dragger>
    </div>
  )
}

export default CustomUpload
