# @ql-frontend/ui

## 1.0.2

### Patch Changes

- 修复EditableTreeTable树数据遍历工具函数中缺少非空及数组校验导致的潜在报错

## 1.0.1

### Patch Changes

- **可编辑树形表格删除配置**: 在 `actionConfig.delete` 配置项中新增 `allowDeleteOnlyOne` 属性，用于控制当表格仅存一条顶级数据时是否允许执行删除操作（默认为 `true`）。当配置为 `false` 且数据仅剩一条时，删除按钮将自动隐藏。

## 1.0.0

### Major Changes

- 初始版本
