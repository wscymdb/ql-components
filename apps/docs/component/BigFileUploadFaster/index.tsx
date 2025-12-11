import { Button, message } from "antd"
import { useEffect, useState } from "react"
import AddModal from "./AddModal"
import { useUpload } from "@ql-react-components/upload-sdk"

const authorization = window.localStorage.getItem("authorization") || ""
const isDev = process.env.NODE_ENV === "development"

const BigFileUpload = () => {
    const [show, setShow] = useState(false)
    const { uploadMap, setUploadConfig } = useUpload()

    useEffect(() => {
        setUploadConfig({
            preventWindowClose: false,
            checkEnabled: false,
            showLog: true,
            serverUrl: isDev
                ? window.location.origin
                : "http://172.22.50.33:20085",
            token: authorization,
            hooks: {
                init: async ctx => {
                    const { file, hash, count } = ctx
                    const res = await fetch("/dcau-api/minio/upload/init", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            authorization: `Bearer ${authorization}`
                        },
                        body: JSON.stringify({
                            originalName: file?.name,
                            // originalUrl: '/',
                            fileSize: file?.size,
                            chunkSize: count,
                            oid: hash,
                            datasetId: "1998960263005573122"
                        })
                    })

                    const json = await res.json()

                    if (json?.code !== 200) {
                        message.error(json?.message || "初始化上传失败")
                        throw new Error(json?.message || "初始化上传失败")
                    }

                    return json.data || {}
                },
                upload: ctx => {
                    const { initData, filename, index } = ctx

                    return {
                        // url: "/dcau-api/minio/upload/part",
                        url: "/abc/upload_chunk",
                        method: "POST",
                        body: {
                            id: initData?.id,
                            chunkNumber: index,
                            filename
                        },
                        chunkFieldName: "file"
                    }
                },

                merge: ctx => {
                    return {
                        url: `/dcau-api/minio/upload/complete?id=${ctx.initData?.id}`,
                        method: "GET"
                    }
                },
                validateResponse(_ctx) {
                    // console.log(ctx, "validateResponse")
                    throw new Error("上传失败，请重试")
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
