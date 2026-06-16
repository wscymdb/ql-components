import React, { useState } from "react"
import { EditableTreeTable, fillTreeKeys } from "@ql-frontend/ui"
import type { ProColumns } from "@ant-design/pro-components"
import { Button, Space, Row, Col, Card } from "antd"

interface RawSchemaNode {
    name: string
    type: "string" | "number" | "boolean" | "object" | "array"
    description?: string
    children?: RawSchemaNode[]
}

const rawApiData: RawSchemaNode[] = [
    {
        name: "status",
        type: "number",
        description: "状态码（无ID）"
    },
    {
        name: "response",
        type: "object",
        description: "响应内容（无ID）",
        children: [
            {
                name: "success",
                type: "boolean",
                description: "标识（无ID）"
            },
            {
                name: "items",
                type: "array",
                description: "项目列表（无ID）",
                children: [
                    {
                        name: "title",
                        type: "string",
                        description: "标题（无ID）"
                    }
                ]
            }
        ]
    }
]

export const FillKeysDemo = () => {
    const [data, setData] = useState<any[]>([])
    const [processed, setProcessed] = useState(false)

    const columns: ProColumns<any>[] = [
        {
            title: "字段名称",
            dataIndex: "name",
            width: "30%"
        },
        {
            title: "字段类型",
            dataIndex: "type",
            width: "30%"
        },
        {
            title: "描述",
            dataIndex: "description",
            width: "40%"
        }
    ]

    const handleProcess = () => {
        const cleaned = fillTreeKeys(rawApiData, "id")
        setData(cleaned)
        setProcessed(true)
    }

    const handleClear = () => {
        setData([])
        setProcessed(false)
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Card title="树形 Key 自动补齐工具演示">
                <p>
                    当接口返回的嵌套树结构数据中缺少唯一标识符（例如 <code>id</code>
                    ）时，直接渲染只读表格会导致折叠状态失效且报错。 点击下方按钮，使用库导出的{" "}
                    <code>fillTreeKeys(data)</code> 预处理函数，能够一键递归补齐唯一 <code>id</code>
                    ，使得组件能正常自动展开和处理。
                </p>
                <Space>
                    <Button type="primary" onClick={handleProcess}>
                        执行 fillTreeKeys 补齐并渲染
                    </Button>
                    <Button onClick={handleClear} disabled={!processed}>
                        重置清空
                    </Button>
                </Space>
            </Card>

            <Row gutter={16}>
                <Col span={12}>
                    <Card title="接口原始数据（无 ID）" bodyStyle={{ padding: 12 }}>
                        <pre style={{ margin: 0, maxHeight: 240, overflow: "auto", fontSize: 12 }}>
                            {JSON.stringify(rawApiData, null, 2)}
                        </pre>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="清洗后填入组件的数据（已补齐 ID）" bodyStyle={{ padding: 12 }}>
                        <pre style={{ margin: 0, maxHeight: 240, overflow: "auto", fontSize: 12 }}>
                            {processed ? JSON.stringify(data, null, 2) : "点击上方按钮开始处理..."}
                        </pre>
                    </Card>
                </Col>
            </Row>

            {processed && (
                <Card title="表格渲染效果（默认自动展开）">
                    <EditableTreeTable readonly value={data} columns={columns} rowKey="id" />
                </Card>
            )}
        </Space>
    )
}

export default FillKeysDemo
