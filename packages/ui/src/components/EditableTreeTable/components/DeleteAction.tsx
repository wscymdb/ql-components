import { DeleteOutlined } from "@ant-design/icons"
import { Tooltip, Popconfirm } from "antd"
import type { BaseTreeRecord, TableActionConfig } from "../types"

export interface DeleteActionProps<T extends BaseTreeRecord> {
    row: T
    config: any
    deleteConfig: TableActionConfig<T>["delete"]
}

export const DeleteAction = <T extends BaseTreeRecord>({ row, config, deleteConfig }: DeleteActionProps<T>) => {
    const deleteIcon = deleteConfig?.icon ?? <DeleteOutlined style={{ cursor: "pointer" }} />
    const finalTooltipProps = {
        title: "删除",
        ...deleteConfig?.tooltipProps
    }

    const runDelete = () => {
        config?.onDelete?.(row.id, row)
    }

    const hasPopconfirm = (() => {
        const showPop = deleteConfig?.showPopconfirm
        if (typeof showPop === "function") {
            return showPop(row)
        }
        return showPop ?? true
    })()

    if (hasPopconfirm) {
        const finalPopconfirmProps = {
            title: "是否执行删除操作？",
            ...deleteConfig?.popconfirmProps,
            onConfirm: (e: any) => {
                deleteConfig?.popconfirmProps?.onConfirm?.(e)
                runDelete()
            }
        }

        return (
            <Tooltip {...finalTooltipProps}>
                <Popconfirm {...finalPopconfirmProps}>{deleteIcon}</Popconfirm>
            </Tooltip>
        )
    }

    return (
        <Tooltip {...finalTooltipProps}>
            <span
                onClick={e => {
                    deleteConfig?.popconfirmProps?.onConfirm?.(e as any)
                    runDelete()
                }}
                style={{ display: "inline-block", cursor: "pointer" }}
            >
                {deleteIcon}
            </span>
        </Tooltip>
    )
}

export default DeleteAction
