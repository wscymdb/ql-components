## ScreenWrapper 组件

ScreenWrapper 用于创建一个基于设计稿尺寸进行等比缩放的大屏容器，常用于大屏展示或需要把固定设计稿按可视窗口等比缩放展示的场景。

**主要场景**：仪表盘、大屏展示、嵌入式固定尺寸画布等，需要把 `designWidth`/`designHeight` 的内容按窗口等比缩放并居中显示。

**文档结构**

- **概述**：组件用途与典型场景
- **API**：Props 说明（类型与默认值）
- **示例**：快速使用示例（TSX）
- **样式与实现细节**：容器行为、缩放实现、注意事项
- **最佳实践**：性能与可访问性提示

**API（Props）**

| 参数              | 说明                                                    |                  类型 | 默认值    |
| ----------------- | ------------------------------------------------------- | --------------------: | --------- |
| `children`        | 要被包裹的内容（组件子元素）                            |     `React.ReactNode` | 必填      |
| `backgroundColor` | 外层背景颜色                                            |              `string` | `#020424` |
| `maxScale`        | 最大缩放比例（上限）                                    |              `number` | `1`       |
| `minScale`        | 最小缩放比例（下限）                                    |              `number` | `0.5`     |
| `style`           | 外层容器的自定义样式（会直接应用到 `WrapperContainer`） | `React.CSSProperties` | `{}`      |
| `designWidth`     | 设计稿宽度（px），内部容器宽度                          |              `number` | `1920`    |
| `designHeight`    | 设计稿高度（px），内部容器高度                          |              `number` | `1080`    |

实现说明：组件会监听 `window.resize`，计算窗口宽高与 `designWidth`/`designHeight` 的比值，取最小值作为缩放比例 `scale`，并在 `minScale`~`maxScale` 范围内限制。缩放通过 CSS `transform: scale(...)` 应用到内部容器上。

**样式与结构**

- 外层容器 `WrapperContainer`：撑满视口（`100vw/100vh`），居中显示，隐藏溢出，接受 `backgroundColor` 与 `style`。
- 内部容器 `ContentWrapper`：宽高固定为 `designWidth`/`designHeight`（px），通过 `transform: scale(scale)` 做等比缩放，transform-origin 为中心。

**代码演示（TSX）**

```tsx
import { ScreenWrapper } from "@ql-frontend/ui"

const ScreenWrapperComponent = () => {
    return (
        <ScreenWrapper
            designWidth={854}
            designHeight={882}
            backgroundColor="#020424"
            style={{
                width: "100%",
                height: "882px",
                backgroundColor: "#fff",
                border: "1px solid #ddd"
            }}
        >
            <div style={{ background: "#f0f0f0" }}>这是大屏布局容器中的内容</div>
        </ScreenWrapper>
    )
}

export default ScreenWrapperComponent
```

**注意事项与最佳实践**

- transform 缩放会影响定位与像素渲染：缩放后的文本或细线条可能出现模糊，必要时优先在设计稿层面调整尺寸或使用矢量元素。
- `position: fixed`/`position: absolute` 在缩放上下文中表现不同：如果内部内容中有固定定位元素，缩放会影响其定位基准，需单独处理。
- 容器使用 `overflow: hidden`，超出部分会被裁切，若需要滚动请在内部元素上实现滚动区域。
- 缩放会影响交互目标尺寸（点击/hover），确保在最小缩放比例下仍然可点击。

**可访问性**

- 缩放不应影响键盘导航和语义结构，确保内部组件维持合理的语义标签（button、nav、main 等）和焦点顺序。

**调试建议**

- 暂时把 `backgroundColor` 和边框打开，方便观察缩放边界。
- 在开发过程中，可在浏览器 console 中输出 `scale` 值以便调试布局断点。

---
