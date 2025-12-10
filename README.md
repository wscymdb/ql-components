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
