import { Button } from "antd"
import { useEffect, useState } from "react"
import AddModal from "./AddModal"
import { useUpload } from "@ym/upload-sdk"

const authorization = window.localStorage.getItem("authorization") || ""
const isDev = process.env.NODE_ENV === "development"

const BigFileUpload = () => {
    const [show, setShow] = useState(false)
    const { uploadMap, setUploadConfig } = useUpload()

    // 上传文件时，防止关闭浏览器窗口
    useEffect(() => {
        setUploadConfig({
            preventWindowClose: true,
            serverUrl: isDev ? window.location.origin : "http://localhost:8888",
            checkEnabled: false,
            token: authorization,
            hooks: {
                init: async ctx => {
                    console.log(ctx, "init")
                    const res = await fetch("/api/lazy")
                    await res.json()

                    return {
                        name: "zs",
                        age: 14
                    }
                },
                upload: ctx => {
                    console.log(ctx, "ctxupload")
                    const { filename } = ctx
                    return {
                        url: "/api/upload_chunk",
                        method: "POST",
                        body: {
                            filename
                        },
                        chunkFieldName: "file"
                    }
                },

                merge: ctx => {
                    console.log(ctx, "ctxmerge")

                    return {
                        url: `/api/upload_merge`,
                        method: "POST",
                        body: JSON.stringify({
                            HASH: ctx.hash,
                            count: ctx.count
                        }),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                }
            }
        })
    }, [setUploadConfig])

    return (
        <div className="big-file-upload">
            <h1>大文件上传</h1>
            <Button onClick={() => setShow(true)}>添加文件</Button>

            {Object.keys(uploadMap).map(key => (
                <div key={key}>
                    {uploadMap[key].uid} - {uploadMap[key].progress}%
                </div>
            ))}

            {show && <AddModal onClose={() => setShow(false)} />}
        </div>
    )
}

export default BigFileUpload
