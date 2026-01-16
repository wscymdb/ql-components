import { useState, useEffect, useRef, useCallback } from "react"
import { UploadManager } from "@/core"
import { UploadBatchError } from "@/utils"
import type { GlobalUploadState, SingleFileState, InitializeConfig, UpdateConfig } from "@/types"

const manager = UploadManager.getInstance()

export const useUpload = () => {
    // 1. 初始化状态
    // 直接从 manager 获取最新快照，防止组件重新挂载时状态回退
    const [uploadMap, setUploadMap] = useState<GlobalUploadState>(() => manager.getState())

    // 2. RAF 引用
    // 用于存储 requestAnimationFrame 的 ID，以便在组件卸载或任务结束时取消轮询
    const rafIdRef = useRef<number | null>(null)

    useEffect(() => {
        // ============================================================
        // 核心优化：RAF (RequestAnimationFrame) 轮询机制
        // ============================================================
        // 为什么不用 subscribe 直接更新？
        // 因为 Worker 发送进度的频率极高 (每秒可能几百次)。
        // 如果每次都 setState，React 会频繁 Re-render，导致页面卡顿。
        // 使用 RAF 变成了 "Pull 模式"：UI 每 16ms 主动去内存里取一次最新数据。
        const loopQuery = () => {
            // A. 从内存获取最新状态
            const latestState = manager.getState()

            // B. 更新 React 状态 (React 会自动 Diff，引用没变不会强行渲染)
            setUploadMap(latestState)

            // C. 检查是否还有任务在跑
            const isUploading = Object.values(latestState).some(item => item.status === "uploading")

            // D. 如果还在上传，预约下一帧继续查询
            if (isUploading) {
                rafIdRef.current = requestAnimationFrame(loopQuery)
            } else {
                // 没任务了，停止轮询，释放 CPU
                rafIdRef.current = null
            }
        }

        // ============================================================
        // 订阅逻辑：作为“点火器”
        // ============================================================
        const unsubscribe = manager.subscribe(newState => {
            const isUploading = Object.values(newState).some(item => item.status === "uploading")

            // 1. 如果监测到任务开始，且轮询还没跑，就启动轮询
            if (isUploading && !rafIdRef.current) {
                loopQuery()
            }

            // 2. 如果任务全部结束 (done/error)，也需要最后同步一次状态
            // 确保 UI 显示的是 100% 或 错误信息
            if (!isUploading) {
                setUploadMap(newState)
            }
        })

        // ============================================================
        // 初始检查 (处理路由跳转回来的情况)
        // ============================================================
        // 如果用户从 Page A 跳到 Page B，Manager 还在跑，
        // 这里能检测到并立即恢复 RAF 轮询，进度条无缝衔接。
        const startState = manager.getState()
        if (Object.values(startState).some(item => item.status === "uploading")) {
            loopQuery()
        }

        // 清理函数
        return () => {
            unsubscribe() // 取消订阅
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current) // 取消 RAF
            }
        }
    }, [])

    /**
     * 触发上传
     * 支持单个 File 或 FileList (AntD, 原生 input)
     */

    const startUpload = useCallback(async (fileList: any[]) => {
        // 兼容 AntD 的 FileList 类数组转普通数组
        const files = Array.isArray(fileList) ? fileList : Array.from(fileList || [])

        // 1. 拿到所有 Promise
        const tasks = files.map(file => manager.startUpload(file))

        // 2. 等待全部结束 (无论成功失败)
        const rawResults = await Promise.allSettled(tasks)

        // 3. 解析结果
        const results = rawResults.map(res => {
            if (res.status === "fulfilled") return res.value

            return res.reason // 这里拿到的就是 Manager 里 reject 的 UploadErrorResult
        })

        // 4. 如果有错误，抛出包含完整结果的异常，供业务层(Modal)捕获
        // 【核心修复】检查是否有 非成功 的项
        // 只要有一个是 error 或者 cancelled，我们就认为这一批次“不完美”，抛出异常让 UI 处理
        const hasIssue = results.some(r => r.status !== "success")

        if (hasIssue) {
            // 抛出 UploadBatchError，把完整的结果单带出去
            throw new UploadBatchError("Batch upload finished with issues", results)
        }

        return results
    }, [])

    /**
     * 安全获取单个文件的状态
     * 避免组件里出现 undefined 报错
     */
    const getFileState = useCallback(
        (uid: string): SingleFileState => {
            return (
                uploadMap[uid] || {
                    uid,
                    progress: 0,
                    status: "idle"
                }
            )
        },
        [uploadMap]
    )

    /**
     * 初始化配置
     */
    const initialize = useCallback((config: InitializeConfig) => {
        manager.initialize(config)
    }, [])

    /**
     * 更新配置
     */
    const updateConfig = useCallback((config: UpdateConfig) => {
        manager.updateConfig(config)
    }, [])

    /**
     * 预计算 Hash
     * 用户在 onChange 时调用
     */
    const preCalculate = useCallback(async (fileList: any[]) => {
        const files = Array.isArray(fileList) ? fileList : Array.from(fileList || [])

        files.forEach(file => {
            const uid = file.uid || file.originFileObj?.uid

            // 1. 如果 map 里已经有这个文件
            const current = manager.getState()[uid]
            if (current) {
                // 如果已经算完了，或者正在算，或者是正在传，都跳过
                if (current.hash || current.status === "calculating" || current.status === "uploading") {
                    return
                }
            }

            // 2. 否则，开始计算
            manager.computeHash(file).catch(err => {
                console.error(err)
            })
        })
    }, [])

    // 取消上传
    const cancelUpload = useCallback((fileOrUid: any) => {
        const uid = typeof fileOrUid === "string" ? fileOrUid : fileOrUid.uid || fileOrUid.originFileObj?.uid

        if (!uid) {
            console.error("缺少 uid", fileOrUid)
            return
        }

        manager.cancelUpload(uid)
    }, [])

    // 重置上传状态
    const reset = useCallback(() => {
        manager.reset()
    }, [])

    const removeFile = useCallback((fileOrUid: any) => {
        const uid = typeof fileOrUid === "string" ? fileOrUid : fileOrUid.uid || fileOrUid.originFileObj?.uid

        if (!uid) {
            console.error("缺少 uid", fileOrUid)
            return
        }

        manager.removeFile(uid)
    }, [])

    return {
        removeFile,
        reset,
        cancelUpload,
        /** 完整的状态 Map { [uid]: state } */
        uploadMap,
        /** 开始上传函数 */
        startUpload,
        /** 获取单文件状态 helper */
        getFileState,
        /** 初始化配置 */
        initialize,
        /** 更新配置 */
        updateConfig,
        /** 预计算 Hash helper */
        preCalculate
    }
}
