import { useState, useEffect, useRef, useCallback } from "react"
// 假设你的核心逻辑在 ../core 目录下
import type { GlobalUploadState, UploadConfig, SingleFileState } from "../types"
import { UploadManager } from "@/core"

// 获取单例 (在模块加载时就初始化，保证整个 App 只有一个 Manager)
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

    // ============================================================
    // Helper Methods (暴露给组件的方法)
    // ============================================================

    /**
     * 触发上传
     * 支持单个 File 或 FileList (AntD, 原生 input)
     */

    const startUpload = useCallback((fileList: any[]) => {
        // 兼容 AntD 的 FileList 类数组转普通数组
        const files = Array.isArray(fileList) ? fileList : Array.from(fileList || [])

        files.forEach(file => {
            manager.startUpload(file)
        })
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
     * 动态设置全局配置
     * 比如在设置页切换并发数、开关防误触等
     */
    const setUploadConfig = useCallback((config: Partial<UploadConfig>) => {
        manager.setConfig(config)
    }, [])

    return {
        /** 完整的状态 Map { [uid]: state } */
        uploadMap,
        /** 开始上传函数 */
        startUpload,
        /** 获取单文件状态 helper */
        getFileState,
        /** 设置配置 helper */
        setUploadConfig
    }
}
