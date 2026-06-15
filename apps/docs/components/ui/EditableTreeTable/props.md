| 参数 | 说明 | 类型 | 默认值 |
| :--- | :--- | :--- | :--- |
| `value` | 树形结构数据源（等同于 Antd Table 的 `dataSource` 树形格式） | `T[]` | `[]` |
| `onChange` | 数据变更回调（实时编辑同步） | `(value: T[]) => void` | - |
| `columns` | 列定义（符合 ProTable `columns` 规范，内置操作列的智能追加） | `ProColumns<T>[]` | 必填 |
| `createRootItemRecord` | 初始化顶级节点数据的方法 | `(newId: React.Key) => T` | - |
| `createSubItemRecord` | 初始化子节点数据的方法 | `(parentRow: T, newId: React.Key) => T` | - |
| `canAddSubItem` | 判定该行是否支持添加子节点（如仅 `type === 'object'` 或 `'array'` 时允许） | `(row: T) => boolean` | `() => !createSubItemRecord` |
| `indentSize` | 树形缩进宽度 | `number` | `24` |
| `showHeaderOnEmpty` | 无数据时是否展示表头。为 `false` 时会展示简洁的添加按钮 | `boolean` | `false` |
| `actionConfig` | 控制操作栏按钮属性（支持透传底层 Antd 组件的 Tooltip / Popconfirm 属性） | `TableActionConfig<T>` | - |
| `showExpandIcon` | 是否显示折叠/展开图标。支持布尔值或动态判断函数（默认不显示） | `boolean \| ((row: T) => boolean)` | `false` |
| `readonly` | 是否为只读/纯展示模式。为 `true` 时禁用所有编辑框、隐藏操作列和新增按钮 | `boolean` | `false` |


---

## Columns 列定义

`columns` 属性完全遵循 **`@ant-design/pro-components` 中的 `ProColumns`** 规范。

```tsx | pure
const columns = [
    {
        title: "属性名称",
        dataIndex: "name",
        formItemProps: { rules: [{ required: true, message: "请输入名称" }] }
    },
    {
        title: "数据类型",
        dataIndex: "type",
        valueType: "select",
        valueEnum: {
            string: { text: "string" },
            number: { text: "number" }
        }
    }
]
```

### 操作列智能追加

组件内部自带智能合并逻辑：

- 如果你的 `columns` 中**没有**声明 `valueType: 'option'` 的操作列，组件会自动在右侧末尾追加默认的“操作”列（包含内置的删除和新增子项按钮）。
- 如果您需要自定义操作列的**宽度**或**自定义渲染（render）**，只需在传入的 `columns` 数组中显式声明一个 `valueType: 'option'` 的列项。组件会自动采用您的声明，并不再追加默认操作列。


```tsx | pure
const columns = [
    // ... 其他常规数据列
    {
        title: "自定义操作",
        valueType: "option",
        width: 120, // 自定义操作列宽度
        render: () => null
    }
]
```

## DataSource

组件的 `value` 属性（即数据源）完全采用 **Ant Design Table 标准的 `dataSource` 树形数据格式**。

- **标准 Antd Table 树形约定**：数据源格式与原生的 Antd Table / ProTable 树形展现完全一致，可直接将现有的树形数据传递给 `value` 属性。
- **唯一标识符**：每个树节点必须包含唯一的 **`id`** 属性（类型为 `React.Key`，即 `string | number`），对应原生表格的 `rowKey`。
- **子节点字段**：层级嵌套子节点列表必须放置在 **`children`** 字段中。

```json | pure
[
    {
        "id": "1",
        "name": "status",
        "type": "number"
    },
    {
        "id": "2",
        "name": "result",
        "type": "object",
        "children": [
            {
                "id": "3",
                "name": "total",
                "type": "number"
            }
        ]
    }
]
```

---

## actionConfig 操作配置

通过 `actionConfig` 可以精细化配置内置操作栏按钮（删除、添加子项）的图标、Tooltip 提示以及二次确认气泡框：

```typescript | pure
export interface TableActionConfig<T> {
  // 删除操作配置
  delete?: {
    // 自定义删除按钮图标
    icon?: React.ReactNode;
    // 透传 Antd Tooltip 组件属性（如 title、placement）
    tooltipProps?: Omit<TooltipProps, "children">;
    // 透传 Antd Popconfirm 气泡确认框属性（如 title、okText）
    popconfirmProps?: Omit<PopconfirmProps, "children">;
    // 是否展示确认气泡，支持静态 boolean 或传入函数动态判定（默认为 true）
    showPopconfirm?: boolean | ((row: T) => boolean);
    // 当只有一条数据时，是否允许删除该数据（默认为 true）
    allowDeleteOnlyOne?: boolean;
  };
  // 新增子项操作配置
  addSub?: {
    // 自定义新增子项按钮图标
    icon?: React.ReactNode;
    // 透传 Antd Tooltip 组件属性
    tooltipProps?: Omit<TooltipProps, "children">;
  };
}
```

---

## 底层组件属性透传

为了保持极高的灵活性，组件支持透传多项参数到底层的 `antd` 或 `ProComponents` 原生组件：

- **Antd Tooltip / Popconfirm 透传**：可以通过上述 `actionConfig` 的 `tooltipProps` 和 `popconfirmProps` 对气泡的位置、文字、确认事件进行深度定制。
- **新增按钮定制**：`recordCreatorProps` 支持透传除 `record` 与 `newRecordType` 之外，`EditableProTable` 底层“新增按钮”的所有配置属性（如按钮文案、图标、样式、禁用状态等）。

