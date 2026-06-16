import React from "react"
import type { TreeRowKeyType } from "./types"

export interface TableContextProps {
    rowKey: TreeRowKeyType
    getRowKey: (record: any) => React.Key
}

export const TableContext = React.createContext<TableContextProps>({
    rowKey: "id",
    getRowKey: record => record?.id ?? ""
})

export const useTableContext = () => React.useContext(TableContext)
