import type { EditableProTableProps, ProColumns, RowEditableConfig } from "@ant-design/pro-components"
import React from "react"

/**
 * 通用的行数据结构约束，必须含有 id，可能有 parentKey 和 children
 */
export interface BaseTreeRecord {
    id: React.Key
    parentKey?: React.Key
    children?: BaseTreeRecord[]
    [key: string]: any
}

/**
 * 排除核心控制属性（record 和 newRecordType）后的新增按钮配置类型
 */
export type TreeRecordCreatorProps<T> =
    | Omit<Exclude<EditableProTableProps<T, any>["recordCreatorProps"], false | undefined>, "record" | "newRecordType">
    | false

/**
 * 通用可编辑树形表格的 Props 定义
 */
export interface BasicEditableTreeTableProps<T extends BaseTreeRecord> {
    value?: T[]
    onChange?: (value: T[]) => void
    columns: ProColumns<T>[]
    /** 允许业务组件定义：如何初始化一个子节点的数据 */
    createSubItemRecord?: (parentRow: T, newId: React.Key) => T
    /** 允许业务组件定义：如何初始化一个顶层节点的数据 */
    createRootItemRecord?: (newId: React.Key) => T
    /** 允许业务组件定义：哪种行可以新增子节点 */
    canAddSubItem?: (row: T) => boolean
    /** actionRef 用于支持 ProTable 的内置操作触发 */
    actionRef?: React.MutableRefObject<any>
    /** 透传样式及缩进设置 */
    indentSize?: number
    style?: React.CSSProperties
    className?: string
    /** 允许外部完全重写操作列的渲染行为 */
    actionRender?: RowEditableConfig<T>["actionRender"]
    /** 允许外部完全定制或隐藏新增按钮，但排除内置的核心数据控制属性 */
    recordCreatorProps?: TreeRecordCreatorProps<T>
    /** 是否在没有数据时显示表头。默认值为 false。如果为 true，则不展示自定义的 EmptyState。 */
    showHeaderOnEmpty?: boolean
    /** 支持外部受控控制编辑态的行 Keys */
    editableKeys?: React.Key[]
    /** 编辑态行 Keys 变更时的回调 */
    onChangeEditableKeys?: (keys: React.Key[]) => void
    /** 支持外部受控控制展开的行 Keys */
    expandedRowKeys?: React.Key[]
    /** 展开行 Keys 变更时的回调 */
    onChangeExpandedRowKeys?: (keys: React.Key[]) => void
    /** 操作按钮的配置选项，包含删除、新增子项等操作的自定义 icon、tooltip 等 */
    actionConfig?: TableActionConfig<T>
    /** 是否显示展开 icon，支持 boolean 或自定义渲染函数 (props: any) => React.ReactNode，默认为 false */
    showExpandIcon?: boolean | ((props: any) => React.ReactNode)
    /** 是否为只读/纯展示模式，默认为 false */
    readonly?: boolean
}
import type { FormInstance, TooltipProps, PopconfirmProps } from "antd"

export interface TableActionConfig<T> {
    /** 删除操作的配置 */
    delete?: {
        icon?: React.ReactNode
        /** 支持透传 Tooltip 组件的所有属性（除了 children） */
        tooltipProps?: Omit<TooltipProps, "children">
        /** 支持透传 Popconfirm 组件的所有属性（除了 children） */
        popconfirmProps?: Omit<PopconfirmProps, "children">
        /** 是否展示确认气泡，支持静态 boolean 或根据行数据动态返回，默认为 true */
        showPopconfirm?: boolean | ((row: T) => boolean)
    }
    /** 新增子项操作的配置 */
    addSub?: {
        icon?: React.ReactNode
        /** 支持透传 Tooltip 组件的所有属性（除了 children） */
        tooltipProps?: Omit<TooltipProps, "children">
    }
}

export interface EditableTreeTableRef {
    validate: () => Promise<any>
    form: FormInstance
}
