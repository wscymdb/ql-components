import { defineConfig } from "tsup"
import { inlineWorkerPlugin } from "./plugins/inline-worker"
import path from "path"

export default defineConfig(_options => ({
    entry: ["src/index.ts"],
    splitting: false,
    sourcemap: false,
    clean: true,
    outDir: "es",
    format: ["esm"],
    dts: true,
    esbuildPlugins: [inlineWorkerPlugin()],

    esbuildOptions(options, _context) {
        options.alias = {
            "@": path.resolve(__dirname, "src")
        }
    }
}))
