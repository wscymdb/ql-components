import { ScreenWrapper } from "@ql-frontend/ui"

const ScreenWrapperComponent = () => {
    return (
        <ScreenWrapper
            designWidth={854} // 设计稿宽度
            designHeight={882} // 设计稿高度
            backgroundColor="#020424" // 背景色
            style={{
                width: "100%", // 演示用
                height: "882",
                backgroundColor: "#fff",
                border: "1px solid #ddd"
            }}
        >
            <div style={{ padding: "20px", background: "#f0f0f0" }}>这是大屏布局容器中的内容</div>
        </ScreenWrapper>
    )
}

export default ScreenWrapperComponent
