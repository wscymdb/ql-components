# EditableTreeTable 可编辑树形表格

`EditableTreeTable` 组件是一个标准的 **Editable Tree Grid（可编辑树形网格）**，专为多级树状结构的实时编辑场景设计。

## 依赖与选型说明

本组件底层深度依赖了 `antd`、`@ant-design/pro-components` 以及 `@ant-design/icons`。

- **为什么选择使用 ProComponents？**
  `EditableTreeTable` 内部基于 ProComponents 的 `EditableProTable` 进行封装。ProComponents 已经在底层针对 Ant Design 的 `Form`（表单）与 `Table`（表格）做好了极其成熟的深度二次封装与值映射。如果仅使用原生 `antd` 基础组件去白手起家实现一套“实时编辑同步、嵌套树节点新增与级联删除、统一表单校验”的复杂组件，其开发成本与后续边缘 Case 的维护精力都过高。因此，借力 ProComponents 可以极大提高组件的产出效率与稳定性，避免重复造轮子。

## 典型场景

- **可视化 JSON Schema 编辑器 (Visual JSON Schema Editor)**：
  适用于 API 接口管理平台（如 YApi、Swagger、Apifox），针对 API 响应数据定义（Response Schema）提供多级嵌套配置。
- **递归数据结构定义器 (Recursive Data Structure Definer)**：
  支持对 `Object` , `Array` 等复杂类型进行树状结构的无限递归嵌套与定义。
- **分层数据集批量/就地编辑器 (Hierarchical Dataset Mass/In-place Editor)**：
  支持在表格视图中直接编辑复杂嵌套数据，具备高性能的实时输入体验。

## 非受控模式 

**推荐默认使用此模式。** 在非受控模式下，组件内部会自动托管“树节点的展开/折叠状态（`expandedRowKeys`）”以及“每一行的编辑状态（`editableKeys`）”。你只需要关注数据源本身（`value` 与 `onChange`），代码最精简，开发和维护成本最低。

<code src="./uncontrolled.tsx"></code>

## 受控模式 

**一般业务场景下不需要使用此模式。** 组件库预留了受控属性，以应对特殊的跨组件联动或外部状态干预需求。

例如在以下场景中可能需要受控：
1. **外部控制状态**：在表格外部放置了辅助按钮，需要实现“一键展开所有行”、“一键折叠所有行”、“一键让所有行进入编辑态”或“取消所有编辑”等操作。
2. **初始化条件渲染**：需要根据外部的其他过滤条件或业务状态，在表格初次渲染时强制让某些特定的行默认展开或默认处于编辑激活状态。

<code src="./controlled.tsx"></code>

## 只读详情模式 

通过传入 `readonly` 属性，你可以快速将树形表格切换为纯展示的详情模式。在该模式下：
- 所有编辑输入框都会被禁用并转为文本渲染。
- 自动隐藏操作列（删除、新增子项操作）。
- 自动隐藏底部的“添加一行”按钮。

<code src="./readonly.tsx"></code>

## API 说明

<embed src="./props.md"></embed>
