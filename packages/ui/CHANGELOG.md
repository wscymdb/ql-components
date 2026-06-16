# @ql-frontend/ui

## 1.1.0

### Minor Changes

- **EditableTreeTable 智能折叠/展开联动能力内置**：
  - **自动折叠功能**：当行节点属性切换导致不满足 `canAddSubItem` 条件时，自动收起折叠该行。
  - **自动展开功能**：当行节点重新切回容器类型（满足 `canAddSubItem`）且原先存在子节点数据时，自动展开该行。
  - **简化业务开发**：业务层只需声明 `canAddSubItem` 即可获得完整防丢失/防误触联动，无需手动管理 `expandedRowKeys`。

### Patch Changes

- **数据健壮性与健壮度优化**：
  - 修复 `value` 解构时如接收到非数组或 `null`/`undefined` 数据而导致的异常问题，增加了针对非数组的空数组 Fallback。
  - 在树节点删除、遍历等工具函数中添加了更加严格的非空及数组类型校验，提升组件在边界值场景下的防崩健壮度。

## 1.0.2

### Patch Changes

- 修复EditableTreeTable树数据遍历工具函数中缺少非空及数组校验导致的潜在报错

## 1.0.1

### Patch Changes

- **可编辑树形表格删除配置**: 在 `actionConfig.delete` 配置项中新增 `allowDeleteOnlyOne` 属性，用于控制当表格仅存一条顶级数据时是否允许执行删除操作（默认为 `true`）。当配置为 `false` 且数据仅剩一条时，删除按钮将自动隐藏。

## 1.0.0

### Major Changes

- 初始版本
