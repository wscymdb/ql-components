import { defineConfig } from "dumi"

export default defineConfig({
    themeConfig: {
        name: "文档"
    },
    publicPath: "/",
    proxy: {
        "/api": {
            target: "http://localhost:8888/",
            changeOrigin: true,
            pathRewrite: { "^/api": "" }
        },
        "/dcau-api": {
            target: "http://172.22.50.33:20085",
            changeOrigin: true,
            pathRewrite: { "^/dcau-api": "/dcau-api" }
        }
    }
})
