/** @type {import("stylelint").Config} */
export default {
    extends: ["stylelint-config-standard"],

    ignoreFiles: ["**/dist/**/*", "**/es/**/*", "**/lib/**/*", "**/.dumi/**/*", "**/.umi/**/*"],

    overrides: [
        {
            files: ["packages/**/*.css"]
        }
    ]
}
