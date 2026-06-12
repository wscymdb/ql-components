import React from "react"
import { EditableTreeTable } from "@ql-frontend/ui"
import type { ProColumns } from "@ant-design/pro-components"

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
        description: "接口状态"
    },
    {
        id: "2",
        name: "result",
        type: "object",
        description: "响应结果体",
        children: [
            {
                id: "3",
                name: "success",
                type: "boolean",
                description: "是否成功"
            },
            {
                id: "4",
                name: "data",
                type: "array",
                description: "返回的列表数据",
                children: [
                    {
                        id: "5",
                        name: "id",
                        type: "number",
                        description: "主键 ID"
                    }
                ]
            }
        ]
    }
]

export const ReadonlyDemo = () => {
    const columns: ProColumns<SchemaNode>[] = [
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

    return <EditableTreeTable<SchemaNode> readonly value={initialData} columns={columns} />
}

export default ReadonlyDemo
