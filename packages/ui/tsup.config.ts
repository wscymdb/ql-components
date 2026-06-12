import { defineConfig } from "tsup"

export default defineConfig({
    entry: ["src"],
    splitting: false,
    sourcemap: false,
    clean: true,
    outDir: "es",
    format: ["esm"],
    dts: true,
    external: ["react", "react-dom", "antd", "@ant-design/icons", "@ant-design/pro-components", "styled-components"]
})
