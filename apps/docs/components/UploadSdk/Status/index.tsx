import React from "react"
import { Card, Progress, Tag, Button, Typography } from "antd"
import {
    FileOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    StopOutlined,
    CloudUploadOutlined,
    ScanOutlined,
    ApiOutlined,
    ClockCircleOutlined
} from "@ant-design/icons"
import type { SingleFileState } from "@ql-frontend/upload-sdk"

const { Text } = Typography

// 模拟构造所有可能的状态数据
const MOCK_DATA: SingleFileState[] = [
    { uid: "1", name: "report_2023.pdf", status: "idle", progress: 0 },
    { uid: "2", name: "waiting_in_queue.mp4", status: "queued", progress: 0 },
    { uid: "3", name: "big_movie_4k.mp4", status: "calculating", progress: 45 },
    { uid: "4", name: "pre_calculated_file.zip", status: "ready", progress: 100, hash: "a1b2c3d4" },
    { uid: "5", name: "connecting_server.png", status: "checking", progress: 0 },
    { uid: "6", name: "uploading_photos.rar", status: "uploading", progress: 68 },
    { uid: "7", name: "finished_project.doc", status: "done", progress: 100, hash: "e5f6g7h8" },
    { uid: "8", name: "error_file_v2.exe", status: "error", progress: 12, errorMsg: "服务器空间不足" },
    { uid: "9", name: "cancelled_task.dmg", status: "cancelled", progress: 30 }
]

const StatusGallery = () => {
    // 这是一个纯展示组件，用于参考如何根据 status 渲染不同的 UI
    const renderStatusContent = (item: SingleFileState) => {
        switch (item.status) {
            case "queued":
                return {
                    icon: <ClockCircleOutlined style={{ color: "#8c8c8c" }} />,
                    text: "队列等待中...",
                    color: "#8c8c8c",
                    action: <Button size="small">取消</Button>
                }
            case "calculating":
                return {
                    icon: <ScanOutlined spin style={{ color: "#faad14" }} />,
                    text: "特征计算中...",
                    color: "#faad14",
                    action: <Button size="small">取消</Button>
                }
            case "ready":
                return {
                    icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
                    text: "校验完成 (秒传就绪)",
                    color: "#52c41a",
                    action: (
                        <Button size="small" type="primary">
                            立即上传
                        </Button>
                    )
                }
            case "checking":
                return {
                    icon: <ApiOutlined style={{ color: "#1890ff" }} />,
                    text: "连接服务器...",
                    color: "#1890ff",
                    action: null
                }
            case "uploading":
                return {
                    icon: <CloudUploadOutlined style={{ color: "#1890ff" }} />,
                    text: "正在上传...",
                    color: "#1890ff",
                    action: (
                        <Button size="small" danger>
                            暂停
                        </Button>
                    )
                }
            case "done":
                return {
                    icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
                    text: "上传成功",
                    color: "#52c41a",
                    action: (
                        <Button size="small" type="link">
                            查看
                        </Button>
                    )
                }
            case "error":
                return {
                    icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
                    text: item.errorMsg || "上传失败",
                    color: "#ff4d4f",
                    action: (
                        <Button size="small" type="primary" danger>
                            重试
                        </Button>
                    )
                }
            case "cancelled":
                return {
                    icon: <StopOutlined style={{ color: "#d9d9d9" }} />,
                    text: "任务已取消",
                    color: "#d9d9d9",
                    action: <Button size="small">重新开始</Button>
                }
            default: // idle
                return {
                    icon: <FileOutlined />,
                    text: "等待处理",
                    color: "rgba(0,0,0,0.45)",
                    action: null
                }
        }
    }

    return (
        <div style={{ padding: 20, background: "#f5f5f5" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {MOCK_DATA.map(item => {
                    const ui = renderStatusContent(item)

                    return (
                        <Card key={item.uid} size="small" bodyStyle={{ padding: "12px 16px" }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 8
                                }}
                            >
                                {/* 文件名与图标 */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                                    {ui.icon}
                                    <Text strong style={{ maxWidth: 200 }} ellipsis>
                                        {item.name}
                                    </Text>
                                    <Tag bordered={false} color={item.status === "error" ? "error" : "default"}>
                                        {item.status.toUpperCase()}
                                    </Tag>
                                </div>

                                {/* 状态描述文本 */}
                                <div style={{ color: ui.color, fontSize: 13 }}>
                                    {ui.text}
                                    {["calculating", "uploading"].includes(item.status) && ` ${item.progress}%`}
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                {/* 进度条 */}
                                <div style={{ flex: 1 }}>
                                    <Progress
                                        percent={item.progress}
                                        strokeColor={ui.color}
                                        status={item.status === "error" ? "exception" : "active"}
                                        showInfo={false}
                                        size="small"
                                    />
                                </div>

                                {/* 操作按钮区 */}
                                <div style={{ minWidth: 60, textAlign: "right" }}>{ui.action}</div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

export default StatusGallery
