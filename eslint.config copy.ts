import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import pluginReact from "eslint-plugin-react"
import { defineConfig, globalIgnores } from "eslint/config"

// --fix表示启用自动修复功能
// eslint --fix 是一个强大的自动化工具，能处理约 70-80% 的代码规范问题，大大提升开发效率！
// "lint:fix": "eslint --fix",

// https://eslint.org/docs/latest/use/getting-started#next-steps
// pnpm create @eslint/config@latest 使用这命令 然后选择就会生成对应的配置文件

// 需要注意的是如果使用 pnpm create 选择配置文件是.ts 也就是eslint.config.ts 而不是js的时候会提示你安装jiti 要记得安装 jiti 可以 让 Node 可以 “直接运行” TS / ESM / JSX，而不用先编译。 如果不想要安装的话就使用eslint.config.js

// eslint9xx中采用的是flat模式 每个item都是一个规则
// 下面的item如果相同规则可以被覆盖
export default defineConfig([
    // 全局过滤  "*.js" 对根目录下的js文件忽略 忽略一些配置文件的检查
    globalIgnores(["apps/**/*/{tmp,.dumi}/**/*", "*.js", "*.config.{ts,js}", "**/*/build/**/*", "**/*/es/**/*", "**/*/dist/**/*"]),

    tseslint.configs.recommended, // tseslint内置规则
    pluginReact.configs.flat.recommended, // react内置规则

    // 自己写的配置覆盖上面两块的默认配置
    // 这里使用ignores不会忽略上面的block规则，因为9x版本中每个block都会对files字段的内容进行检测
    // 当匹配到ignores就会跳过这个block进行下一个block 如果把这block提前写，那么就没法覆盖了 所以使用globalIgnores做全局过滤
    {
        // 哪些文件应用规则 eslint采用的是glob语法匹配
        files: ["packages/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        plugins: { js },
        // v9版本不建议使用languageOptions.parser了
        // 对于ts tseslint.configs.recommended 会自动的处理parser以及其余的配置
        languageOptions: {
            // 告诉 ESLint：这个配置块里的文件运行在浏览器环境，有哪些全局变量是合法的 比如window.xxx 这些全局变量默认情况下 ESLint是不认识的。
            globals: globals.browser
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
            "no-unused-vars": "warn"
        }
    }
    // 这里不做对某个文件单独匹配规则覆盖 有需要可以拆分 比如只对.tsx做单独操作避免污染其他配置
    // {
    //     // 哪些文件应用规则 eslint采用的是glob语法匹配
    //     files: ["./packages/**/*.tsx"],
    // }
])
