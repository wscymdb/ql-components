import { defineConfig } from "dumi"

export default defineConfig({
    themeConfig: {
        name: "@ym/docs"
    },
    proxy: {
        "/api": {
            target: "http://localhost:8888/",
            changeOrigin: true,
            pathRewrite: { "^/api": "" }
        }
    }
})
