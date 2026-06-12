import { PartitionOutlined } from "@ant-design/icons"
import { Tooltip } from "antd"
import type { BaseTreeRecord, TableActionConfig } from "../types"

export interface AddSubActionProps<T extends BaseTreeRecord> {
    row: T
    addSubConfig: TableActionConfig<T>["addSub"]
    createSubItemRecord?: (parentRow: T, newId: React.Key) => T
    canAddSubItem: (row: T) => boolean
    onAddSub: (row: T) => void
}

export const AddSubAction = <T extends BaseTreeRecord>({
    row,
    addSubConfig,
    createSubItemRecord,
    canAddSubItem,
    onAddSub
}: AddSubActionProps<T>) => {
    const showAddSub = !!createSubItemRecord && canAddSubItem(row)
    if (!showAddSub) return null

    const addSubIcon = addSubConfig?.icon ?? <PartitionOutlined style={{ cursor: "pointer" }} />
    const finalTooltipProps = {
        title: "新增子项",
        ...addSubConfig?.tooltipProps
    }

    return (
        <Tooltip {...finalTooltipProps}>
            <span onClick={() => onAddSub(row)} style={{ display: "inline-block", cursor: "pointer" }}>
                {addSubIcon}
            </span>
        </Tooltip>
    )
}

export default AddSubAction
