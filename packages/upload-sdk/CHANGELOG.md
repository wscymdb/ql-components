# @ql-react-components/upload-sdk

## 0.2.0

### Minor Changes

-   API 变更: useUpload 的 startUpload 方法签名变更。
    -   旧: (files: any[]) => void
    -   新: (files: any[]) => Promise<UploadResult[]

## 0.1.1

### Patch Changes

-   修复 react 版本依赖改为>=18

## 0.1.0

### Minor Changes

-   发布初始版本，大文件上传功能实现切片上传以及其余附加属性
