/** @type {import("stylelint").Config} */
export default {
    extends: ["stylelint-config-standard"],

    overrides: [
        {
            files: ["packages/**/*.css"]
        }
    ]
}
