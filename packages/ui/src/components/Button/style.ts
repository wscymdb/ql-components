// Button组件的样式规则都在这里
import { CSSProperties } from "react"
import styled, { css } from "styled-components"
import { ButtonVariant } from "./types"

type VariantColorResolverResult = {
    color: CSSProperties["color"]
    background: CSSProperties["background"]
    hover: CSSProperties["background"]
    border: CSSProperties["border"]
}

const variantMap: Record<ButtonVariant, VariantColorResolverResult> = {
    filled: {
        color: "",
        background: "",
        hover: "",
        border: ""
    },
    light: {
        color: "",
        background: "",
        hover: "",
        border: ""
    },
    outline: {
        color: "",
        background: "",
        hover: "",
        border: ""
    },
    transparent: {
        color: "",
        background: "",
        hover: "",
        border: ""
    },
    white: {
        color: "",
        background: "",
        hover: "",
        border: ""
    },
    subtle: {
        color: "",
        background: "",
        hover: "",
        border: ""
    },
    default: {
        color: "#383838",
        background: "#f5f5f5",
        hover: "",
        border: "1px solid #e9e9e9"
    },
    gradient: {
        color: "",
        background: "",
        hover: "",
        border: ""
    }
}

const getVariantColor = (variant: ButtonVariant = "default") => variantMap[variant]

// 按钮的高度变量
const ButtonVarsCss = css`
    --button-height-xs: 30px;
    --button-height-sm: 36px;
    --button-height-md: 42px;
    --button-height-lg: 50px;
    --button-height-xl: 60px;
`

/**
 * 组件外层容器
 */
export const StyledButton = styled.button<{ variant?: ButtonVariant }>`
    ${ButtonVarsCss}

    // 基础样式
    display: inline-block;
    font-weight: 400;
    text-align: center;
    white-space: nowrap;
    vertical-align: middle;
    user-select: none;
    padding: 0.375rem 0.75rem;
    font-size: 1rem;
    line-height: 1.5;
    border-radius: 0.25rem;
    transition:
        color 0.15s,
        background-color 0.15s,
        border-color 0.15s;
    cursor: pointer;

    // 变体样式
    color: ${({ variant }) => getVariantColor(variant).color};
    background: ${({ variant }) => getVariantColor(variant).background};
    border: ${({ variant }) => getVariantColor(variant).border};

    &:hover {
        color: ${({ variant }) => getVariantColor(variant).hover};
        background: ${({ variant }) => getVariantColor(variant).hover};
        border: ${({ variant }) => getVariantColor(variant).hover};
    }
`
