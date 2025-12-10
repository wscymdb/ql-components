import { type Plugin, build as esbuildBuild } from "esbuild"
import path from "path"

export const inlineWorkerPlugin = (): Plugin => {
    return {
        name: "inline-worker",
        setup(build) {
            build.onResolve({ filter: /\?worker$/ }, args => {
                const cleanPath = args.path.replace(/\?worker$/, "")
                const absolutePath = path.resolve(args.resolveDir, cleanPath)
                return {
                    path: absolutePath,
                    namespace: "inline-worker"
                }
            })

            build.onLoad({ filter: /.*/, namespace: "inline-worker" }, async args => {
                // 1. 获取 Worker 所在的目录
                // args.path 是 .../src/worker/index.ts
                // workerDir 就是 .../src/worker
                const workerDir = path.dirname(args.path)

                // 2. 启动子构建
                const buildResult = await esbuildBuild({
                    entryPoints: [args.path],
                    write: false,
                    bundle: true,
                    minify: true,
                    format: "iife",
                    target: "es2015",
                    platform: "browser",
                    plugins: []
                })

                const { outputFiles } = buildResult
                if (!outputFiles || outputFiles.length === 0) {
                    throw new Error(`Worker build failed`)
                }
                const workerCode = outputFiles[0].text

                return {
                    contents: `export default ${JSON.stringify(workerCode)};`,
                    loader: "js",

                    // 【🔥 核心改动 🔥】
                    // 暴力监听：只要 worker 目录下的任何文件变动，强制触发重新打包
                    // 这样不管你是改了 utils.ts 还是 types.ts，主进程都会收到通知
                    watchDirs: [workerDir]
                }
            })
        }
    }
}
