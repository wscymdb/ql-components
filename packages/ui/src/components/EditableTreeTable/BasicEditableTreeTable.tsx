import type { RowEditableConfig } from "@ant-design/pro-components"
import { EditableProTable } from "@ant-design/pro-components"
import React, { useImperativeHandle, useMemo } from "react"
import { generateId, insertChild, getRowKey, detectKeyField } from "./utils"
import EmptyState from "./components/EmptyState"
import DeleteAction from "./components/DeleteAction"
import AddSubAction from "./components/AddSubAction"
import type { BaseTreeRecord, BasicEditableTreeTableProps, EditableTreeTableRef } from "./types"
import { useEditableTreeTable } from "./hooks/useEditableTreeTable"
import type { FormInstance } from "antd/lib/form"
import { TableContext } from "./context"

// NOTE: 使用外部定义的 EMPTY_ARRAY 统一空值引用，避免每次渲染直接分配 `[]` 新引用，
// 导致 useMemo 依赖比对失效或子组件（如 EditableProTable）发生重复渲染。
const EMPTY_ARRAY: any[] = []

const BasicEditableTreeTableInner = <T extends BaseTreeRecord>(
    props: BasicEditableTreeTableProps<T>,
    ref: React.Ref<EditableTreeTableRef>
) => {
    const {
        columns,
        actionRef,
        style,
        className,
        recordCreatorProps,
        editableKeys: controlledEditableKeys,
        expandedRowKeys: controlledExpandedRowKeys,
        showHeaderOnEmpty = false,
        indentSize = 24,

        onChange,
        createSubItemRecord,
        createRootItemRecord,
        canAddSubItem = () => !!createSubItemRecord,
        actionRender: actionRenderProp,
        onChangeEditableKeys,
        onChangeExpandedRowKeys,
        actionConfig,
        showExpandIcon,
        readonly = false,
        rowKey = "id"
    } = props

    const value = Array.isArray(props.value) ? props.value : (EMPTY_ARRAY as T[])

    const formRef = React.useRef<FormInstance>()

    // 暴露 validate 校验方法和内部的 form 实例给外部
    useImperativeHandle(ref, () => ({
        validate: () => formRef.current?.validateFields() ?? Promise.resolve(),
        form: formRef.current!
    }))

    // 使用自定义 Hook 统一管理编辑态和展开态的 keys
    const { editableKeys, setEditableRowKeys, expandedRowKeys, setExpandedRowKeys } = useEditableTreeTable({
        value,
        editableKeys: controlledEditableKeys,
        onChangeEditableKeys,
        expandedRowKeys: controlledExpandedRowKeys,
        onChangeExpandedRowKeys,
        canAddSubItem,
        rowKey
    })

    // 缓存 Context Value 以避免非必要重绘
    const contextValue = useMemo(
        () => ({
            rowKey,
            getRowKey: (record: any) => getRowKey(record, rowKey)
        }),
        [rowKey]
    )

    // NOTE: 智能追加操作列。如果外部传入的 columns 中没有配置 valueType 为 option 的列，
    // 我们在内部自动追加一个默认的操作列，以确保组件默认开箱即用。
    const finalColumns = React.useMemo(() => {
        if (readonly) {
            return columns
        }
        const hasOptionCol = columns.some(col => col.valueType === "option")
        if (hasOptionCol) {
            return columns
        }
        return [
            ...columns,
            {
                title: "操作",
                valueType: "option" as const,
                width: 60
            }
        ]
    }, [columns, readonly])

    // 处理新增子节点
    const addSubItem = (row: T) => {
        if (!createSubItemRecord) return

        const newId = generateId()
        const newSubItem = createSubItemRecord(row, newId)
        const rowId = getRowKey(row, rowKey)
        const newSubItemKey = getRowKey(newSubItem, rowKey)

        const newDataSource = insertChild(value, rowId, newSubItem, rowKey)
        onChange?.(newDataSource)

        // 激活新节点的编辑态
        setEditableRowKeys(prev => [...prev, newSubItemKey])

        // 自动展开该父节点，以展示新插入的子节点
        setExpandedRowKeys(prev => {
            const exists = prev.some(key => String(key) === String(rowId))
            if (!exists) {
                return [...prev, rowId]
            }
            return prev
        })
    }

    // 生成一个新的顶层行节点对象
    const generateRootItem = (): T => {
        const newId = generateId()

        if (createRootItemRecord) {
            return createRootItemRecord(newId)
        }

        if (typeof rowKey === "string") {
            return { [rowKey]: newId } as unknown as T
        }

        if (typeof rowKey === "function") {
            const detectedKey = detectKeyField(rowKey)
            return { [detectedKey]: newId } as unknown as T
        }

        return { id: newId } as unknown as T
    }

    // 专门针对表格无数据（空状态）时，添加首行顶层数据的处理方法
    const addRootItem = () => {
        const newRootItem = generateRootItem()
        onChange?.([...value, newRootItem])

        const newRootItemKey = getRowKey(newRootItem, rowKey)
        // 激活新节点的编辑态
        setEditableRowKeys(prev => [...prev, newRootItemKey])
    }

    const actionRender: RowEditableConfig<T>["actionRender"] = (row, config) => {
        return [
            <DeleteAction
                key="delete"
                row={row}
                config={config}
                deleteConfig={actionConfig?.delete}
                isOnlyOne={value.length === 1}
            />,
            <AddSubAction
                key="addSub"
                row={row}
                addSubConfig={actionConfig?.addSub}
                createSubItemRecord={createSubItemRecord}
                canAddSubItem={canAddSubItem}
                onAddSub={addSubItem}
            />
        ].filter(Boolean)
    }

    const onValuesChange: RowEditableConfig<T>["onValuesChange"] = (_, recordList) => {
        onChange?.(recordList)
    }

    // 智能合并新增按钮的配置
    const getRecordCreatorProps = () => {
        // 如果是只读模式或外部显式传了 false，说明想彻底隐藏它
        if (readonly || recordCreatorProps === false) {
            return false
        }
        return {
            position: "bottom" as const,
            ...recordCreatorProps,
            // 强制使用内部的核心配置，防止在运行时被外部传入的值覆写导致异常
            newRecordType: "dataSource" as const,
            record: generateRootItem
        }
    }

    // 没有数据就只展示一个添加按钮 不显示表头
    if ((!value || value?.length === 0) && !showHeaderOnEmpty && !readonly) {
        return (
            <TableContext.Provider value={contextValue}>
                <EmptyState
                    style={style}
                    className={className}
                    recordCreatorProps={recordCreatorProps}
                    onAdd={addRootItem}
                />
            </TableContext.Provider>
        )
    }

    return (
        <TableContext.Provider value={contextValue}>
            <EditableProTable<T>
                editableFormRef={formRef}
                rowKey={rowKey}
                value={value}
                style={style}
                className={className}
                // NOTE: 在实时编辑同步模式下，所有行在未保存前都是 Form 的临时编辑数据。
                // 此时表格增、删、改等所有交互都会作为 Form 值变更触发 editable.onValuesChange，而不会触发 Table 级别的 onChange。
                // 因此这里无需配置 Table 级别的 onChange，完全由下面的 editable.onValuesChange 负责更新并同步最新的 recordList 给外部的 onChange。
                columns={finalColumns}
                indentSize={indentSize}
                actionRef={actionRef}
                expandable={{
                    expandIcon:
                        typeof showExpandIcon === "function"
                            ? showExpandIcon
                            : showExpandIcon === true
                              ? undefined
                              : () => null,
                    expandedRowKeys,
                    onExpandedRowsChange: keys => setExpandedRowKeys(keys as React.Key[])
                }}
                scroll={{
                    x: "max-content"
                }}
                recordCreatorProps={getRecordCreatorProps()}
                editable={{
                    type: "multiple",
                    editableKeys: readonly ? [] : editableKeys,
                    onChange: setEditableRowKeys,
                    actionRender: actionRenderProp || actionRender,
                    onValuesChange
                }}
            />
        </TableContext.Provider>
    )
}

export const BasicEditableTreeTable = React.forwardRef(BasicEditableTreeTableInner) as <T extends BaseTreeRecord>(
    props: BasicEditableTreeTableProps<T> & {
        ref?: React.Ref<EditableTreeTableRef>
    }
) => React.ReactElement

export default BasicEditableTreeTable
