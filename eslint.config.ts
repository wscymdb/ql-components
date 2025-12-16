import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"
import path from "node:path"

export default defineConfig([
    globalIgnores([
        "dist",
        "**/.dumi/tmp/**",
        "**/.dumi/tmp-production/**",
        "es/**"
    ]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended
        ],

        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,

            parserOptions: {
                project: [
                    "packages/*/tsconfig.json", // 匹配 packages 下的包
                    "apps/*/tsconfig.json", // 匹配 apps 下的应用
                    "./tsconfig.json" // 根目录的 tsconfig
                ].filter(Boolean),
                // ✅ 指向 monorepo 根目录
                tsconfigRootDir: path.resolve(process.cwd())
            }
        },
        rules: {
            "@typescript-eslint/no-unused-expressions": [
                "error",
                {
                    allowShortCircuit: true, // 允许短路求值：a && b()
                    allowTernary: true, // 允许三元表达式：a ? b() : c()
                    allowTaggedTemplates: true // 允许标记模板字符串
                }
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_", // 忽略以下划线开头的参数
                    varsIgnorePattern: "^_", // 以下划线开头的变量不视为未使用
                    caughtErrorsIgnorePattern: "^_" // 以下划线开头的 catch 错误参数不视为未使用
                }
            ],
            "@typescript-eslint/no-explicit-any": "off"
        }
    }
])
