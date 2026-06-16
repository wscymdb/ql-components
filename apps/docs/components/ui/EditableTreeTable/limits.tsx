import React, { useState, useRef } from "react"
import { EditableTreeTable } from "@ql-frontend/ui"
import type { EditableTreeTableRef } from "@ql-frontend/ui"
import type { ProColumns } from "@ant-design/pro-components"
import { Alert, Space } from "antd"

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
        description: "响应数据"
    }
]

export const LimitsDemo = () => {
    const [data, setData] = useState<SchemaNode[]>(initialData)
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

    const MAX_ROOT_COUNT = 3

    return (
        <Space direction="vertical" size="middle" style={{ display: "flex", width: "100%" }}>
            <Alert
                message="动态限制规则示例"
                description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                        <li>
                            <strong>根节点数量限制：</strong>根节点最多只能创建 {MAX_ROOT_COUNT}{" "}
                            个（达到上限时底部的“添加参数”按钮会被禁用且展示提示）。
                        </li>
                        <li>
                            <strong>数组子项数量限制：</strong>类型为 <code>array</code> 的行，最多只能添加 1
                            个子节点（模拟 JSON Schema 中对 array 类型的 items 节点定义）。
                        </li>
                        <li>
                            <strong>对象子项数量限制：</strong>类型为 <code>object</code> 的行，可以添加无限个子节点。
                        </li>
                        <li>
                            <strong>普通类型限制：</strong>其他基本类型（如 string, number）不允许添加子节点。
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
                // 💡 动态控制：允许在什么条件下添加子节点
                canAddSubItem={row => {
                    if (row.type === "array") {
                        const childCount = row.children?.length || 0
                        return childCount < 2 // 数组最多只能添加 2 个子节点
                    }
                    return row.type === "object" // 仅 object 支持添加多个子节点
                }}
                // 💡 动态控制：根节点达到最大限制时禁用添加按钮
                recordCreatorProps={{
                    creatorButtonText: "添加参数",
                    disabled: data.length >= MAX_ROOT_COUNT
                }}
            />
        </Space>
    )
}
export default LimitsDemo
