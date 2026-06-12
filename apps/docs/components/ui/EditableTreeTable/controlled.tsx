import React, { useState, useRef } from "react"
import { EditableTreeTable } from "@ql-frontend/ui"
import type { EditableTreeTableRef } from "@ql-frontend/ui"
import type { ProColumns } from "@ant-design/pro-components"
import { Button, Space, message } from "antd"

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
        name: "status",
        type: "number",
        description: "状态"
    },
    {
        id: "2",
        name: "result",
        type: "object",
        description: "结果集",
        children: [
            {
                id: "3",
                name: "total",
                type: "number",
                description: "总数"
            }
        ]
    }
]

export const ControlledDemo = () => {
    const [data, setData] = useState<SchemaNode[]>(initialData)
    const [editableKeys, setEditableKeys] = useState<React.Key[]>(["1", "2", "3"]) // 默认全都进入编辑状态
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>(["2"]) // 默认展开
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

    const handleValidate = async () => {
        try {
            await tableRef.current?.validate()
            message.success("表单校验通过！")
            console.log("最新数据：", data)
        } catch {
            message.error("表单校验失败，请检查输入！")
        }
    }

    return (
        <Space vertical style={{ width: "100%" }} size="middle">
            <Button type="primary" onClick={handleValidate}>
                校验表单并获取数据
            </Button>

            <EditableTreeTable<SchemaNode>
                ref={tableRef}
                value={data}
                onChange={setData}
                columns={columns}
                editableKeys={editableKeys}
                onChangeEditableKeys={setEditableKeys}
                expandedRowKeys={expandedRowKeys}
                onChangeExpandedRowKeys={setExpandedRowKeys}
                createRootItemRecord={newId => ({ id: newId, name: `field_${newId}`, type: "string" })}
                createSubItemRecord={(parent, newId) => ({ id: newId, name: `sub_field_${newId}`, type: "string" })}
                canAddSubItem={row => row.type === "object" || row.type === "array"}
            />

            <div style={{ background: "#fafafa", padding: 16, borderRadius: 8 }}>
                <div style={{ fontWeight: "bold", marginBottom: 8 }}>实时数据 (value):</div>
                <pre style={{ margin: 0, maxHeight: 200, overflow: "auto", fontSize: 12 }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </Space>
    )
}

export default ControlledDemo
