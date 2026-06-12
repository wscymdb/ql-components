import { FC } from "react"
import { StyledButton } from "./style"
import { ButtonProps } from "./types"

/**
 * 示例
 */
export const Button: FC<ButtonProps> = (props: ButtonProps) => {
    const { variant = "default", children } = props

    return <StyledButton variant={variant}>{children}</StyledButton>
}
