# 规范设计

## vscode 插件

-   可以借助 vscode 插件在编写的时候做到错误的提示，避免了 commit 发现一堆错误
-   Error Lens 更明显的提示错误
-   ESLint eslint 检查
-   Stylelint stylelint 的检查
-   Code Spell Checker 拼写的检查

## 规范集合

-   **js(eslint9、prettier)**

    -   [eslint](https://eslint.org/docs/latest/use/getting-started)
    -   [prettier](https://prettier.io/docs/install)

-   **style(stylelint)**

    -   [stylelint](https://stylelint.io/user-guide/get-started)

-   **拼写检查(cspell)**

    -   [cspell](https://cspell.org/docs/getting-started)

-   **提交规范(commitlint、husky)**

    -   [commitlint](https://commitlint.js.org/guides/getting-started.html)
    -   [husky](https://typicode.github.io/husky/get-started.html)
    -   [cz-git](https://cz-git.qbb.sh/zh/guide/)
    -   [commitizen](https://www.npmjs.com/package/commitizen)

## lint-staged 优化 commit 检查

-   当工程量上去以后每次 commit 都会触发所有文件的检查那么开销是非常大的，
-   借助 lint-staged 只用对 staged(暂存区)中的文件进行检查(git add .之后文件会进入暂存区)
-   减少性能开销

# 开发流程

本项目采用 monorepo 的方式管理多个子项目，借助 pnpm 的 workspace 功能实现的，所以请使用**pnpm**来管理依赖

## 安装

```bash
pnpm install
```

## 运行

```bash
pnpm dev
```

## 构建

```bash
pnpm build:sdk
```

## 安装依赖

-   因为本项目采用的是 monorepo 所以在安装依赖的时候需要添加一些参数

### --filter

pnpm --filter 参数用于筛选并仅对特定的包执行命令，在 monorepo（多包仓库）中非常有用。它允许你只对满足条件的包进行操作，而不影响其他包。

**举例**

```bash
# 只对指定包执行命令
pnpm --filter "my-package" dev
pnpm --filter "package-a" test

# 对指定目录下的包执行命令
pnpm --filter "./packages/utils" build
pnpm --filter "./apps/*" start
```

### 安装根目录依赖

-   使用-w 参数安装根目录依赖
-   可以在任意目录执行根目录的安装 只要使用-w 就会安装到根目录

```bash
pnpm add -w <依赖包名>

# 举例 给根目录安装dayjs
pnpm add -w dayjs

# 举例 给根目录安装eslint（开发依赖）
pnpm add -wD  eslint
```

### 安装子包依赖

-   使用--filter 参数安装子包依赖 就不用进入到子包目录执行安装了
-   子包名就是子包的 package.json 中的 name 字段

```bash
pnpm add --filter <子包名> <依赖包名>

# 举例 给子包ql-components安装dayjs
pnpm add --filter ql-components dayjs
```

# 发包流程

```bash
# 1. 构建子包 如果已经构建过了可以跳过这一步
pnpm build:sdk

# 2. 登录 如果登录过了可以跳过这一步
pnpm login

# 3. 生成 changelog
pnpm changeset

# 4. 发布
pnpm publish
```
