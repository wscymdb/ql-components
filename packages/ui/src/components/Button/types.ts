import React from "react"

/**
 * 不直接把buttonVariants写在类型中 而是写一个数组 然后类型中取数组的元素的原因是 后面这个数组的内容可以在代码中使用
 *
 * 如果直接写在类型中了 比如 type ButtonVariant= 'filled' | 'light'
 *
 * 那么后面要是代码中用到了 就还要重复的写一遍
 */
export const buttonVariants = [
    "default",
    "filled",
    "light",
    "outline",
    "transparent",
    "white",
    "subtle",
    "gradient"
] as const

export type ButtonVariant = (typeof buttonVariants)[number]

export interface ButtonProps {
    /**
     * @default 'default'
     * @description 按钮的变体
     */
    variant?: ButtonVariant

    /**
     * @description children
     */
    children?: React.ReactNode
}
