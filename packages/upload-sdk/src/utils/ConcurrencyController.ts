/**
 * 通用并发控制器
 * 
 * 用于控制异步任务的并发执行数量,超出限制的任务会自动排队等待。
 * 
 * @example
 * ```typescript
 * const controller = new ConcurrencyController<string>(3)
 * 
 * // 提交 10 个任务,但只有 3 个会同时执行
 * const promises = files.map(file => 
 *   controller.run(() => uploadFile(file))
 * )
 * 
 * const results = await Promise.all(promises)
 * ```
 */
export class ConcurrencyController<T> {
    private concurrency: number
    private running: number = 0
    private queue: Array<{
        task: () => Promise<T>
        resolve: (value: T) => void
        reject: (error: any) => void
    }> = []

    /**
     * @param concurrency 最大并发数,默认为 3
     */
    constructor(concurrency: number = 3) {
        this.concurrency = Math.max(1, concurrency)
    }

    /**
     * 提交一个任务到并发控制器
     * 
     * @param task 要执行的异步任务函数
     * @returns Promise,在任务完成时 resolve
     */
    async run(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // 将任务加入队列
            this.queue.push({ task, resolve, reject })
            // 尝试执行队列中的任务
            this.processQueue()
        })
    }

    /**
     * 处理队列中的任务
     * 如果当前运行数未达到并发上限,则从队列中取出任务执行
     */
    private processQueue() {
        // 如果已达到并发上限,或队列为空,则不处理
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return
        }

        // 从队列头部取出一个任务
        const item = this.queue.shift()
        if (!item) return

        // 增加运行计数
        this.running++

        // 执行任务
        item.task()
            .then(result => {
                // 任务成功,resolve Promise
                item.resolve(result)
            })
            .catch(error => {
                // 任务失败,reject Promise
                item.reject(error)
            })
            .finally(() => {
                // 无论成功失败,都减少运行计数
                this.running--
                // 继续处理队列中的下一个任务
                this.processQueue()
            })
    }

    /**
     * 动态调整并发数
     * 
     * @param newLimit 新的并发上限
     */
    updateConcurrency(newLimit: number) {
        this.concurrency = Math.max(1, newLimit)
        // 如果提高了并发数,尝试执行更多任务
        this.processQueue()
    }

    /**
     * 获取当前状态信息
     */
    getStatus() {
        return {
            concurrency: this.concurrency,
            running: this.running,
            queued: this.queue.length
        }
    }

    /**
     * 清空队列(不会中断正在运行的任务)
     */
    clearQueue() {
        // 拒绝所有排队中的任务
        this.queue.forEach(item => {
            item.reject(new Error("Queue cleared"))
        })
        this.queue = []
    }
}
