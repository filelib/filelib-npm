import { BasePlugin, Body, Meta, Uppy } from "@uppy/core"
import { FilelibFile, UploaderOpts } from "@filelib/client/types"
import { filterFilesToEmitUploadStarted, filterNonFailedFiles } from "@uppy/utils/lib/fileFilters"
import Client from "@filelib/client/browser"
import { DefinePluginOpts } from "@uppy/core/lib/BasePlugin"
import { FilelibUppyOpts } from "./types"
import { UploadError } from "@filelib/client/browser"
import { UppyFile } from "@uppy/utils/lib/UppyFile"

// This is only the optional values.
const defaultOptions = {
    limit: 20,
    parallelUploads: 5,
    onError: () => void 0
} satisfies Partial<FilelibUppyOpts>

type Opts = DefinePluginOpts<FilelibUppyOpts, keyof typeof defaultOptions>

export default class FilelibUppy<M extends Meta, B extends Body> extends BasePlugin<Opts, M, B> {
    id: string = "Filelib"
    client: Client

    constructor(uppy: Uppy<M, B>, opts: FilelibUppyOpts) {
        super(uppy, { ...defaultOptions, ...opts })
        this.type = "uploader"
        this.id = this.opts.id || "Filelib"
        const onError = (err: UploadError) => {
            console.log("INIT ERROR", err)
            this.uppy.emit("error", err)
            this.opts?.onError(err)
        }

        this.client = new Client({ authKey: opts.authKey, onError })

        this.uppy.on("file-removed", (file) => {
            console.log("REMOVING FILE", file)
            this.client.removeFile({ id: file.id })
        })

        this.uppy.on("file-added", (file) => {
            this.addFile(file)
        })
        console.log("Filelib uploader initialized with opts", opts)
    }

    private addFile(file: UppyFile<M, B>) {
        const onProgress = (bytesUploaded: number, bytesTotal: number) => {
            console.log("Updating progress ", bytesUploaded, bytesTotal, file.progress)
            this.uppy.emit("upload-progress", file, {
                // uploadStarted: f.progress.uploadStarted ?? 0,
                uploadStarted: 1,
                bytesUploaded,
                bytesTotal: file.size
            })
        }

        const onSuccess = (filelibFile: FilelibFile & { uploadURL: string }) => {
            const uploadResp = {
                uploadURL: filelibFile.uploadURL,
                status: 200,
                body: {} as B
            }
            console.log("Ayoo", filelibFile)
            this.uppy.emit("upload-success", file, uploadResp)

            this.opts?.onSuccess(filelibFile)
        }

        const onError: UploaderOpts["onError"] = (fileMeta, err: UploadError) => {
            console.log("UPLOAD ERROR", file, err)
            this.uppy.emit("upload-error", file, err)

            this.opts?.onError(err)
        }

        this.client.addFile({
            id: file.id,
            file: file.data as File,
            config: this.opts.config,
            useCache: this.client.opts.useCache,
            metadata: { name: file.name, size: file.size, type: file.type },
            onProgress,
            onSuccess,
            onError
        })
    }

    uploadFiles = async (files: UppyFile<M, B>[]): Promise<void> => {
        console.log("RECEIVED FILES FOR UPLOAD", files)
        console.log("CLIENT", Client)

        if (!this.client.files || this.client.files.length < 1) {
            this.uppy.emit("error", new Error("No Files to upload in Filelib Client."))
            return
        }

        this.client.upload()
    }

    #handleUpload = async (fileIDs: string[]) => {
        console.log("#handleUpload CALLED", fileIDs)
        this.uppy.log("INITIATING UPLOAD")
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
    }

    install(): void {
        this.uppy.addUploader(this.#handleUpload)
    }

    uninstall(): void {
        this.uppy.removeUploader(this.#handleUpload)
    }
}
