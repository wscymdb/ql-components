import { defineConfig } from "tsup"
import { inlineWorkerPlugin } from "./plugins/inline-worker"
import path from "path"

const isDev = process.env.NODE_ENV === "development"

export default defineConfig(_options => ({
    entry: ["src/index.ts"],
    splitting: false,
    sourcemap: isDev,
    clean: true,
    outDir: "es",
    format: ["esm"],
    dts: true,
    minify: !isDev,
    esbuildPlugins: [inlineWorkerPlugin()],

    esbuildOptions(options, _context) {
        options.alias = {
            "@": path.resolve(__dirname, "src")
        }
    }
}))
