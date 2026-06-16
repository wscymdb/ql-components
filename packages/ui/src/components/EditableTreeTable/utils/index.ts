import type { TreeRowKeyType } from "../types"

// 递归递增计数器，防止 1ms 内快速创建导致 Key 冲突
let idCounter = Date.now()

/**
 * 简单生成唯一 ID，供内部临时节点使用
 */
export const generateId = (): number => {
    idCounter += 1
    return idCounter
}

/**
 * 统一获取行数据的唯一标识 Key 的辅助函数
 */
export const getRowKey = <T>(record: T, rowKey?: TreeRowKeyType<T>): React.Key => {
    if (!record) return ""
    if (typeof rowKey === "function") {
        return rowKey(record)
    }
    const keyName = rowKey || "id"
    return (record as any)[keyName]
}

/**
 * 递归将新子节点插入到对应 parentId 的父节点 children 中
 * @param list 树形数据源
 * @param parentId 父节点 ID
 * @param childNode 要插入的子节点
 * @param rowKey 行数据的唯一标识键属性名或获取函数
 * @returns 更新后的树形数据
 */
export const insertChild = (
    list: readonly any[],
    parentId: React.Key,
    childNode: any,
    rowKey?: TreeRowKeyType
): any[] => {
    if (!Array.isArray(list)) return []
    return list.map(item => {
        if (!item) return item
        const key = getRowKey(item, rowKey)
        if (String(key) === String(parentId)) {
            const children = item.children ? [...item.children] : []
            return {
                ...item,
                children: [...children, childNode]
            }
        }
        if (item.children && item.children.length > 0) {
            return {
                ...item,
                children: insertChild(item.children, parentId, childNode, rowKey)
            }
        }
        return item
    })
}

/**
 * 递归获取树形数据中所有节点的 ID/Key
 * @param list 树形数据
 * @param rowKey 行数据的唯一标识键属性名或获取函数
 * @returns 所有节点 ID/Key 的数组
 */
export const getAllRowKeys = (list: readonly any[], rowKey?: TreeRowKeyType): React.Key[] => {
    const keys: React.Key[] = []
    const traverse = (nodes: readonly any[]) => {
        if (!Array.isArray(nodes)) return
        nodes.forEach(node => {
            if (node) {
                const key = getRowKey(node, rowKey)
                if (isValidKey(key)) {
                    keys.push(key)
                }
            }
            if (node && node.children && node.children.length > 0) {
                traverse(node.children)
            }
        })
    }
    traverse(list)
    return keys
}

/**
 * 递归获取树形数据中所有拥有子节点的节点 ID/Key
 * @param list 树形数据
 * @param rowKey 行数据的唯一标识键属性名或获取函数
 * @returns 所有父节点 ID/Key 的数组
 */
export const getParentRowKeys = (list: readonly any[], rowKey?: TreeRowKeyType): React.Key[] => {
    const keys: React.Key[] = []
    const traverse = (nodes: readonly any[]) => {
        if (!Array.isArray(nodes)) return
        nodes.forEach(node => {
            if (node && node.children && node.children.length > 0) {
                const key = getRowKey(node, rowKey)
                if (isValidKey(key)) {
                    keys.push(key)
                }
                traverse(node.children)
            }
        })
    }
    traverse(list)
    return keys
}

export const isFunction = (val: unknown): val is (...args: any[]) => any => {
    return typeof val === "function"
}

export const isValidKey = (val: unknown): val is React.Key => {
    return val !== undefined && val !== null && val !== ""
}

/**
 * 动态探测 rowKey 函数中读取的键名
 * @param rowKeyFn rowKey 获取函数
 * @returns 探测到的键名，默认返回 "id"
 */
export const detectKeyField = (rowKeyFn: (record: any) => React.Key): string => {
    let accessedKey = "id"
    const createProxy = (): any => {
        return new Proxy(
            {},
            {
                get(target, prop) {
                    accessedKey = prop as string
                    return createProxy()
                }
            }
        )
    }
    try {
        rowKeyFn(createProxy())
    } catch {
        // 忽略执行中的任何异常
    }
    return accessedKey
}

/**
 * 递归为树形数据补齐唯一标识符（不污染原始数据引用，进行浅拷贝拷贝）
 * @param list 原始树形数据
 * @param rowKey 行数据的唯一标识键名，默认是 'id'
 * @returns 补齐标识符后的新树形数据
 */
export const fillTreeKeys = <T extends Record<string, any> = any>(list: T[], rowKey: string = "id"): T[] => {
    if (!Array.isArray(list)) return []
    return list.map(item => {
        if (!item) return item
        const newItem = { ...item } as any

        const currentKey = newItem[rowKey]
        if (!isValidKey(currentKey)) {
            newItem[rowKey] = generateId()
        }

        if (newItem.children && Array.isArray(newItem.children)) {
            newItem.children = fillTreeKeys(newItem.children, rowKey)
        }

        return newItem as T
    })
}
