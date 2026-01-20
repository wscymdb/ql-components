import { defineConfig } from "cspell"

/**
 * package.json中的script脚本含义
 * --color：彩色输出
 * --show-suggestions：显示拼写建议
 * --no-summary：不显示总结信息
 * --words-only：只输出错误的单词
 * --quiet：只显示错误，不显示成功信息
 * --cache： 使用缓存 加快下一次检查速度
 * --dot：包含以点号（.）开头的文件和目录。 默认情况下会忽略以 . 开头的文件和目录
 * --gitignore 参数用于让 CSpell 尊重并应用 .gitignore 文件中的规则。 默认情况下，CSpell 会检查所有匹配的文件，包括那些在 .gitignore 中被忽略的文件
 *
 * 如果指定了files 里面的没有东西会报错 假设我们下面packages和apps都没有内容就会报错 只要一个有命中的就不会报错
 *
 * --config cspell.config.js 使用这个配置文件
 *"spellcheck": "cspell  --config cspell.config.js"
 */

// 建议使用vscode插件 Code Spell Checker 这样在写的时候就会提示 省的打包时候才发现
// 拼写检查配置
export default defineConfig({
    version: "0.2",
    // 是否区分大小写：false 表示不区分，'cat' 和 'CAT' 会被视为同一个单词
    caseSensitive: false,

    // 指定具体文件路径模式
    files: ["packages/**/*.{js,ts,jsx,tsx}", "apps/**/*.{js,ts,jsx,tsx}"],

    // 自定义词典定义
    dictionaryDefinitions: [
        {
            name: "custom-words", // 词典名称
            path: "./.cspell/custom-words.txt", // 词典文件路径

            // 允许通过命令行或API向此词典添加新单词
            addWords: true
        }
    ],
    // 启用的词典列表，这里使用上面定义的 custom-words 词典
    dictionaries: ["custom-words"],
    ignorePaths: [
        "**/node_modules/**",
        "**/dist/**",
        "**/lib/**",
        "**/stats.html",
        "**/language/**",
        "**/language.ts",
        "**/package.json",
        "eslint.config.js",
        "pnpm-lock.yaml"
    ]
})
