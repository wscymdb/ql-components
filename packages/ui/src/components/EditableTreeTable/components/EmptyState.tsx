import { Button } from "antd"
import React from "react"
import type { TreeRecordCreatorProps } from "../types"

interface EmptyStateProps {
    style?: React.CSSProperties
    className?: string
    recordCreatorProps?: TreeRecordCreatorProps<any>
    onAdd: () => void
}

/**
 * 通用可编辑树形表格的空状态引导组件
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ style, className, recordCreatorProps, onAdd }) => {
    if (recordCreatorProps === false) {
        return null
    }

    return (
        <div style={style} className={className}>
            <Button block type={recordCreatorProps?.type || "dashed"} style={{ margin: "24px 0" }} onClick={onAdd}>
                {recordCreatorProps?.creatorButtonText || "添加一行"}
            </Button>
        </div>
    )
}

export default EmptyState
