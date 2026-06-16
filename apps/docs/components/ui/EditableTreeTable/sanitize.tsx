import React, { useState, useRef } from "react"
import { EditableTreeTable } from "@ql-frontend/ui"
import type { EditableTreeTableRef } from "@ql-frontend/ui"
import type { ProColumns } from "@ant-design/pro-components"
import { Alert, Space, Button, message, Col, Row } from "antd"

interface SchemaNode {
    id: React.Key
    name: string
    type: "string" | "number" | "boolean" | "object" | "array"
    description?: string
    children?: SchemaNode[]
}

const initialData: SchemaNode[] = [
    {
        id: "1",
        name: "response",
        type: "object",
        description: "响应数据体",
        children: [
            {
                id: "2",
                name: "code",
                type: "number",
                description: "响应码"
            },
            {
                id: "3",
                name: "message",
                type: "string",
                description: "提示消息"
            }
        ]
    }
]

// NOTE: 递归清洗工具函数，剔除非容器节点的 children 属性
const sanitizeTreeData = (nodes: SchemaNode[]): SchemaNode[] => {
    return nodes.map(node => {
        const cleanedNode = { ...node }
        if (cleanedNode.type !== "object" && cleanedNode.type !== "array") {
            // 非容器类型，彻底删除 children 属性以防携带脏数据
            delete cleanedNode.children
        } else if (cleanedNode.children) {
            // 容器类型，继续递归清洗子节点
            cleanedNode.children = sanitizeTreeData(cleanedNode.children)
        }
        return cleanedNode
    })
}

export const SanitizeDemo = () => {
    const [data, setData] = useState<SchemaNode[]>(initialData)
    const [sanitizedData, setSanitizedData] = useState<SchemaNode[] | null>(null)
    const tableRef = useRef<EditableTreeTableRef>(null)

    const columns: ProColumns<SchemaNode>[] = [
        {
            title: "字段名称",
            dataIndex: "name",
            formItemProps: { rules: [{ required: true, message: "请输入名称" }] }
        },
        {
            title: "字段类型",
            dataIndex: "type",
            valueType: "select",
            valueEnum: {
                string: { text: "string" },
                number: { text: "number" },
                boolean: { text: "boolean" },
                object: { text: "object" },
                array: { text: "array" }
            }
        },
        {
            title: "描述",
            dataIndex: "description"
        }
    ]

    const handleSanitizeSubmit = async () => {
        try {
            await tableRef.current?.validate()
            const cleaned = sanitizeTreeData(data)
            setSanitizedData(cleaned)
            message.success("数据校验与清洗成功！请在下方查看对比")
        } catch {
            message.error("表单校验未通过，请检查红框输入")
        }
    }

    return (
        <Space direction="vertical" size="middle" style={{ display: "flex", width: "100%" }}>
            <Alert
                message="数据防丢失与静默清洗校验示例"
                description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                        <li>
                            <strong>数据防丢失（误操作保护）：</strong>
                            尝试将 <code>response</code> 的类型由 <code>object</code> 切换为 <code>string</code>
                            。您会发现其展开状态被自动重置（由于组件内部集成了 <code>canAddSubItem</code>{" "}
                            规则，会自动进行折叠收起），且展开箭头被自动隐藏。但原先的子项依旧缓存在内存中。当您重新将类型切回{" "}
                            <code>object</code> 时，展开按钮再次显现，并且因为有子项数据会被
                            <strong>组件内部自动重新展开</strong>，真正做到免配置的“后悔药”联动！
                        </li>
                        <li>
                            <strong>数据清洗（格式规范）：</strong>
                            若在切换为 <code>string</code> 状态下直接提交，非容器节点携带 <code>children</code>{" "}
                            属于脏数据。点击下方【校验并清洗数据】按钮，可实现将无用子项递归剔除，获取规范的数据结构。
                        </li>
                    </ul>
                }
                type="info"
                showIcon
            />

            <EditableTreeTable<SchemaNode>
                ref={tableRef}
                value={data}
                onChange={setData}
                columns={columns}
                createRootItemRecord={newId => ({ id: newId, name: `field_${newId}`, type: "string" })}
                createSubItemRecord={(parent, newId) => ({ id: newId, name: `sub_field_${newId}`, type: "string" })}
                // 💡 仅 object/array 可以添加子节点
                canAddSubItem={row => row.type === "object" || row.type === "array"}
                // 💡 仅 object/array 显示展开箭头
                // showExpandIcon={customExpandIcon}
            />

            <Space>
                <Button type="primary" onClick={handleSanitizeSubmit}>
                    校验并清洗数据
                </Button>
            </Space>

            <Row gutter={16}>
                <Col span={12}>
                    <div style={{ background: "#fafafa", padding: 16, borderRadius: 8, height: "100%" }}>
                        <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                            当前内存中的原始数据 (包含隐藏的 children):
                        </div>
                        <pre style={{ margin: 0, maxHeight: 300, overflow: "auto", fontSize: 12 }}>
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </Col>
                <Col span={12}>
                    <div style={{ background: "#fafafa", padding: 16, borderRadius: 8, height: "100%" }}>
                        <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                            清洗后待提交的数据 (安全移除基本类型的 children):
                        </div>
                        <pre style={{ margin: 0, maxHeight: 300, overflow: "auto", fontSize: 12 }}>
                            {sanitizedData ? JSON.stringify(sanitizedData, null, 2) : "尚未执行清洗，请点击上方按钮"}
                        </pre>
                    </div>
                </Col>
            </Row>
        </Space>
    )
}

export default SanitizeDemo
