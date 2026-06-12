import React, { useState, useMemo } from "react"
import { getAllRowKeys, getParentRowKeys, isFunction } from "../utils"
import type { BaseTreeRecord } from "../types"

interface UseEditableTreeTableProps<T> {
    value: T[]
    editableKeys?: React.Key[]
    expandedRowKeys?: React.Key[]
    onChangeEditableKeys?: (keys: React.Key[]) => void
    onChangeExpandedRowKeys?: (keys: React.Key[]) => void
}

export type KeysOrUpdater = React.Key[] | ((prev: React.Key[]) => React.Key[])
export type KeysSetter = (nextKeysOrUpdater: KeysOrUpdater) => void

/**
 * 自动处理可编辑树形表格的编辑态和展开态逻辑的 Hook
 * @param value 数据源
 * @param props 包含受控的可编辑和展开 keys
 */
export function useEditableTreeTable<T extends BaseTreeRecord>(props: UseEditableTreeTableProps<T>) {
    const {
        value,
        editableKeys: controlledEditableKeys,
        expandedRowKeys: controlledExpandedRowKeys,

        onChangeEditableKeys,
        onChangeExpandedRowKeys
    } = props

    const [internalExpandedRowKeys, setInternalExpandedRowKeys] = useState<React.Key[]>([])
    const [prevValueLength, setPrevValueLength] = useState(0)

    // 使用 useMemo 缓存所有节点 ID，作为非受控下的可编辑 keys 来源（避免使用 useEffect 异步/同步更新 state 导致的死循环渲染）
    const computedEditableKeys = useMemo(() => getAllRowKeys(value), [value])

    // 合并受控与非受控状态
    const editableKeys = controlledEditableKeys !== undefined ? controlledEditableKeys : computedEditableKeys

    const setEditableRowKeys: KeysSetter = nextKeysOrUpdater => {
        // NOTE：非受控模式下 当value变化了那么computedEditableKeys也会变化 所以不需要手动调用这个方法
        if (!onChangeEditableKeys) return

        const nextKeys = isFunction(nextKeysOrUpdater)
            ? nextKeysOrUpdater(controlledEditableKeys || [])
            : nextKeysOrUpdater

        onChangeEditableKeys(nextKeys)
    }

    const isExpandedControlled = controlledExpandedRowKeys !== undefined
    const expandedRowKeys = isExpandedControlled ? controlledExpandedRowKeys : internalExpandedRowKeys

    const setExpandedRowKeys: KeysSetter = nextKeysOrUpdater => {
        if (isExpandedControlled) {
            const nextKeys = isFunction(nextKeysOrUpdater)
                ? nextKeysOrUpdater(controlledExpandedRowKeys || [])
                : nextKeysOrUpdater
            onChangeExpandedRowKeys?.(nextKeys)
            return
        }

        setInternalExpandedRowKeys(nextKeysOrUpdater)
    }

    // NOTE: 当为非受控模式且数据源由 0 变有值（比如初始化或 API 加载成功时），默认展开所有包含子节点的行
    const valueLength = value?.length || 0
    if (!isExpandedControlled && valueLength > 0 && prevValueLength === 0) {
        // 渲染阶段直接调整 State（React 18 官方推荐的派生状态更新方式，避免了 useEffect 的二次重绘及 setTimeout 延迟）
        setPrevValueLength(valueLength)
        setInternalExpandedRowKeys(getParentRowKeys(value))
    } else if (valueLength !== prevValueLength) {
        setPrevValueLength(valueLength)
    }

    return {
        editableKeys,
        setEditableRowKeys,
        expandedRowKeys,
        setExpandedRowKeys
    }
}
