export interface ScreenWrapperProps {
    children: React.ReactNode
    backgroundColor?: string // 背景颜色，默认为 #020424
    maxScale?: number // 最大缩放比例，默认为 1
    minScale?: number // 最小缩放比例，默认为 0.5
    style?: React.CSSProperties // 自定义样式
    designWidth?: number // 设计稿宽度，默认为 1920
    designHeight?: number // 设计稿高度，默认为 1080
}
