import { BasePlugin, Body, Meta, Uppy } from "@uppy/core"
import { filterFilesToEmitUploadStarted, filterNonFailedFiles } from "@uppy/utils/lib/fileFilters"
import Client from "@filelib/client/browser"
import { Config } from "@filelib/client"

import { DefinePluginOpts } from "@uppy/core/lib/BasePlugin"
import { FilelibUppyOpts } from "./types"
import { UppyFile } from "@uppy/utils/lib/UppyFile"

// This is only the optional values.
const defaultOptions = {
    limit: 20,
    parallelUploads: 5
} satisfies Partial<FilelibUppyOpts<Record<string, unknown>, Record<string, unknown>>>

// type Opts<M extends Meta, B extends Body> = DefinePluginOpts<FilelibUppyOpts<M, B>, keyof typeof defaultOptions>

type Opts<M extends Meta, B extends Body> = DefinePluginOpts<FilelibUppyOpts<M, B>, keyof typeof defaultOptions>

export default class FilelibUppy<M extends Meta, B extends Body> extends BasePlugin<Opts<M, B>, M, B> {
    client: Client

    constructor(uppy: Uppy<M, B>, opts: FilelibUppyOpts<M, B>) {
        super(uppy, { ...defaultOptions, ...opts })
        this.type = "uploader"
        this.id = this.opts.id || "Filelib"
        // window.genHash = genHash
        console.log("Filelib client", Client)
        this.client = new Client({ auth_key: opts.auth_key })

        console.log("Filelib uploader initialized with opts", opts, this.opts)
        console.log("Filelib UPPY plugin opts", this.opts)
    }

    /**
     * Process upload for a local file.
     * @param {UppyFile} file
     * @private
     */
    #uploadLocalFile(file: UppyFile<M, B>): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return new Promise<string>((resolve, reject) => {
            this.uppy.emit("upload-success", this.uppy.getFile(file.id), {
                uploadURL: "uploadURL",
                status: 200,
                body: {} as B
            })
        }).catch((err) => {
            this.uppy.emit("upload-error", file, err)
            throw err
        })
    }

    uploadFiles = async (files: UppyFile<M, B>[]): Promise<void> => {
        console.log("RECEIVED FILES FOR UPLOAD", files)
        console.log("CLIENT", Client)

        files.forEach((f) => {
            // TODO: take config as a parameter.
            const config = new Config({ storage: "s3main" })

            const onProgress = (bytesUploaded: number, bytesTotal: number) => {
                console.log("Updating progress ", bytesUploaded, bytesTotal, f.progress)
                this.uppy.emit("upload-progress", f, {
                    // uploadStarted: f.progress.uploadStarted ?? 0,
                    uploadStarted: 1,
                    bytesUploaded,
                    bytesTotal: f.size
                })
            }

            const onSuccess = (file: UppyFile<M, B> & { uploadURL: string }) => {
                const uploadResp = {
                    uploadURL: file.uploadURL,
                    status: 200,
                    body: {} as B
                }
                console.log("Ayoo")
                this.opts?.onSuccess(file)
                this.uppy.emit("upload-success", f, uploadResp)
            }

            this.client.add_file({ file: f, config, onProgress, onSuccess })
        })
        if (!this.client.files || this.client.files.length < 1) {
            this.uppy.emit("error", new Error("No Files to upload in Filelib Client."))
            return
        }

        this.client.upload()
    }

    // eslint-disable-next-line no-unused-private-class-members
    async #uploadFiles(files: UppyFile<M, B>[]) {
        console.log("#uploadFiles", files)
        const filesFiltered = filterNonFailedFiles(files)
        const filesToEmit = filterFilesToEmitUploadStarted(filesFiltered)
        this.uppy.emit("upload-start", filesToEmit)

        await Promise.allSettled(
            filesFiltered.map((file) => {
                if (file.isRemote) {
                    // const getQueue = () => this.requests
                    // const controller = new AbortController()
                    //
                    // const removedHandler = (removedFile: UppyFile<M, B>) => {
                    //     if (removedFile.id === file.id) controller.abort()
                    // }
                    // this.uppy.on("file-removed", removedHandler)
                    //
                    // const uploadPromise = this.uppy.getRequestClientForFile<RequestClient<M, B>>(file).uploadRemoteFile(
                    //     file,
                    //     {
                    //         ...file.remote?.body,
                    //         protocol: "XHR",
                    //         size: file.data.size,
                    //         metadata: file.meta
                    //     },
                    //     {
                    //         signal: controller.signal,
                    //         getQueue
                    //     }
                    // )
                    //
                    // this.requests.wrapSyncFunction(
                    //     () => {
                    //         this.uppy.off("file-removed", removedHandler)
                    //     },
                    //     { priority: -1 }
                    // )()
                    // return uploadPromise
                }

                return this.#uploadLocalFile(file)
            })
        )
    }

    #handleUpload = async (fileIDs: string[]) => {
        console.log("#handleUpload CALLED", fileIDs)
        if (fileIDs.length === 0) {
            this.uppy.log("No files to upload")
            return
        }

        this.uppy.log("[Filelib] Uploading...")
        const filesToUpload = this.uppy.getFilesByIds(fileIDs)
        const filesFiltered = filterNonFailedFiles(filesToUpload)
        const filesToEmit = filterFilesToEmitUploadStarted(filesFiltered)
        this.uppy.emit("upload-start", filesToEmit)

        await this.uploadFiles(filesToEmit)
        // await this.#uploadFiles(filesToUpload)
    }

    install(): void {
        this.uppy.addUploader(this.#handleUpload)
    }

    uninstall(): void {
        this.uppy.removeUploader(this.#handleUpload)
    }
}
