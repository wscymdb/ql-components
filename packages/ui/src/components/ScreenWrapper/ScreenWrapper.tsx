import { useEffect, useState, useCallback } from "react"
import { ScreenWrapperProps } from "./types"
import { WrapperContainer, ContentWrapper } from "./styles"

/**
 * ScreenWrapper 组件用于创建一个等比缩放的容器
 * - 根据设计稿宽高进行等比缩放
 * - 支持传入自定义的设计稿宽高
 */
export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    backgroundColor = "#020424", // 默认背景色
    maxScale = 1, // 最大缩放比例
    minScale = 0.5, // 最小缩放比例
    style = {}, // 允许传递自定义样式
    designWidth = 1920, // 设计稿宽度（默认 1920）
    designHeight = 1080 // 设计稿高度（默认 1080）
}) => {
    const [scale, setScale] = useState(1)

    const resize = useCallback(() => {
        const ww = window.innerWidth
        const wh = window.innerHeight

        // 计算等比缩放比例
        let s = Math.min(ww / designWidth, wh / designHeight)

        // 限制缩放比例在 minScale 和 maxScale 之间
        s = Math.max(minScale, Math.min(s, maxScale))

        // 使用 requestAnimationFrame 推迟状态更新
        window.requestAnimationFrame(() => {
            setScale(s)
        })
    }, [maxScale, minScale, designWidth, designHeight])

    useEffect(() => {
        resize() // 初始化时调用一次 resize 函数
        window.addEventListener("resize", resize)
        return () => window.removeEventListener("resize", resize)
    }, [resize])

    return (
        <WrapperContainer style={style} backgroundColor={backgroundColor}>
            <ContentWrapper scale={scale} designWidth={designWidth} designHeight={designHeight}>
                {children}
            </ContentWrapper>
        </WrapperContainer>
    )
}
