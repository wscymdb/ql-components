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
        name: "code",
        type: "number",
        description: "状态码"
    },
    {
        id: "2",
        name: "data",
        type: "object",
        description: "数据体",
        children: [
            {
                id: "3",
                name: "list",
                type: "array",
                description: "列表数据"
            }
        ]
    }
]

export const UncontrolledDemo = () => {
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
        <Space vertical size="middle" style={{ display: "flex", width: "100%" }}>
            <EditableTreeTable<SchemaNode>
                ref={tableRef}
                value={data}
                onChange={setData}
                columns={columns}
                createRootItemRecord={newId => ({ id: newId, name: `field_${newId}`, type: "string" })}
                createSubItemRecord={(parent, newId) => ({ id: newId, name: `sub_field_${newId}`, type: "string" })}
                canAddSubItem={row => row.type === "object" || row.type === "array"}
            />
            <Space>
                <Button type="primary" onClick={handleValidate}>
                    校验表单并获取数据
                </Button>
            </Space>
            <div style={{ background: "#fafafa", padding: 16, borderRadius: 8 }}>
                <div style={{ fontWeight: "bold", marginBottom: 8 }}>实时数据 (value):</div>
                <pre style={{ margin: 0, maxHeight: 200, overflow: "auto", fontSize: 12 }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </Space>
    )
}
export default UncontrolledDemo
