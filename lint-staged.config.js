/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
    // 数组中表示执行的命令
    "*.{js,jsx,ts,tsx}": ["pnpm spellcheck", "pnpm lint:fix", "prettier --write"],
    "*.css": ["pnpm lint:style", "pnpm spellcheck"]
}
