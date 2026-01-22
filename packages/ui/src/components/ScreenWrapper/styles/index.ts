import styled from "styled-components"

// 外部容器
interface WrapperContainerProps {
    backgroundColor: string
}

export const WrapperContainer = styled.div<WrapperContainerProps>`
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    background: ${props => props.backgroundColor};
`

// 包裹内容的容器，应用缩放
interface ContentWrapperProps {
    scale: number
    designWidth: number
    designHeight: number
}

export const ContentWrapper = styled.div<ContentWrapperProps>`
    width: ${props => props.designWidth}px;
    height: ${props => props.designHeight}px;
    transform: scale(${props => props.scale});
    transform-origin: center center;
`
