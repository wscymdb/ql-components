import { Button, message, Upload, UploadProps, Card, Tag, Space, Alert, Statistic, Row, Col } from "antd"
import { useEffect, useState, useMemo } from "react"
import { useUpload } from "@ql-frontend/upload-sdk"
import { UploadOutlined, FileOutlined } from "@ant-design/icons"
import type { UploadFile } from "antd/es/upload/interface"

const ConcurrencyDemo = () => {
    const { startUpload, setup, uploadMap } = useUpload()
    const [fileList, setFileList] = useState<UploadFile[]>([])

    useEffect(() => {
        setup({
            serverUrl: "/api",
            uploadConcurrency: 2, // 同时上传 2 个文件
            hashConcurrency: 2, // 同时计算 2 个 Hash
            chunkConcurrency: 3 // 每个文件同时上传 3 个切片
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // 只在组件挂载时执行一次

    // 统计当前状态
    const stats = useMemo(() => {
        const files = Object.values(uploadMap)
        return {
            queued: files.filter(f => f.status === "queued").length,
            calculating: files.filter(f => f.status === "calculating").length,
            uploading: files.filter(f => f.status === "uploading").length,
            done: files.filter(f => f.status === "done").length,
            total: files.length
        }
    }, [uploadMap])

    const uploadProps: UploadProps = {
        name: "file",
        multiple: true,
        fileList,
        beforeUpload: () => false,
        onChange: ({ fileList }) => setFileList(fileList),
        showUploadList: false
    }

    const handleUpload = async () => {
        if (fileList.length === 0) return message.warning("请选择文件")

        try {
            await startUpload(fileList.map(f => f.originFileObj))
            message.success("所有文件上传成功!")
        } catch (_err) {
            message.error("部分文件上传失败")
        }
    }

    return (
        <div style={{ padding: 20 }}>
            <Alert
                message="并发控制演示"
                description="当前配置: uploadConcurrency=2 (最多同时上传2个文件), hashConcurrency=2, chunkConcurrency=3。请选择多个文件观察并发效果。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            {/* 实时统计 */}
            <Card title="实时并发状态" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Statistic title="队列等待" value={stats.queued} suffix={`/ ${stats.total}`} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="正在计算Hash" value={stats.calculating} valueStyle={{ color: "#1890ff" }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="正在上传" value={stats.uploading} valueStyle={{ color: "#52c41a" }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="已完成" value={stats.done} valueStyle={{ color: "#8c8c8c" }} />
                    </Col>
                </Row>
            </Card>

            <Space style={{ marginBottom: 16 }}>
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>选择多个文件</Button>
                </Upload>
                <Button type="primary" onClick={handleUpload} disabled={fileList.length === 0}>
                    开始上传
                </Button>
            </Space>

            {/* 文件列表 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.values(uploadMap).map(item => (
                    <Card key={item.uid} size="small" bodyStyle={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <FileOutlined />
                                <span>{item.name}</span>
                            </div>
                            <div>
                                {item.status === "queued" && <Tag color="default">队列等待</Tag>}
                                {item.status === "calculating" && <Tag color="blue">计算Hash</Tag>}
                                {item.status === "uploading" && <Tag color="green">上传中 {item.progress}%</Tag>}
                                {item.status === "done" && <Tag color="success">完成</Tag>}
                                {item.status === "error" && <Tag color="error">失败</Tag>}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default ConcurrencyDemo
