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
 * 递归将新子节点插入到对应 parentId 的父节点 children 中
 * @param list 树形数据源
 * @param parentId 父节点 ID
 * @param childNode 要插入的子节点
 * @returns 更新后的树形数据
 */
export const insertChild = (list: readonly any[], parentId: React.Key, childNode: any): any[] => {
    if (!Array.isArray(list)) return []
    return list.map(item => {
        if (!item) return item
        if (String(item.id) === String(parentId)) {
            const children = item.children ? [...item.children] : []
            return {
                ...item,
                children: [...children, childNode]
            }
        }
        if (item.children && item.children.length > 0) {
            return {
                ...item,
                children: insertChild(item.children, parentId, childNode)
            }
        }
        return item
    })
}

/**
 * 递归获取树形数据中所有节点的 ID
 * @param list 树形数据
 * @returns 所有节点 ID 的数组
 */
export const getAllRowKeys = (list: readonly any[]): React.Key[] => {
    const keys: React.Key[] = []
    const traverse = (nodes: readonly any[]) => {
        if (!Array.isArray(nodes)) return
        nodes.forEach(node => {
            if (node && node.id !== undefined && node.id !== null) {
                keys.push(node.id)
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
 * 递归获取树形数据中所有拥有子节点的节点 ID
 * @param list 树形数据
 * @returns 所有父节点 ID 的数组
 */
export const getParentRowKeys = (list: readonly any[]): React.Key[] => {
    const keys: React.Key[] = []
    const traverse = (nodes: readonly any[]) => {
        if (!Array.isArray(nodes)) return
        nodes.forEach(node => {
            if (node && node.children && node.children.length > 0) {
                if (node.id !== undefined && node.id !== null) {
                    keys.push(node.id)
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
