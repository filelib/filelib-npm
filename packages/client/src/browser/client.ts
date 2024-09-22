/**
 * Client Object that communicates with Filelib API.
 *
 * */
import { AuthOptions, FilelibClientOpts, UploaderOpts } from "../types"
import { FileConfigRequiredError, NoFileToUploadError } from "../exceptions"

import Auth from "./auth"
import BaseClient from "../blueprints/client"
import Config from "../config"
import { default as FileReader } from "tus-js-client/lib/browser/fileReader"
import { groupArray } from "@justinmusti/utils"
import { Storage } from "@justinmusti/storage"
import Uploader from "../uploader"

const defaultOpts: Partial<FilelibClientOpts> = {
    parallelUploads: 5
}

export default class Client extends BaseClient {
    auth: Auth
    config?: Config
    files!: Uploader[]
    opts: Partial<FilelibClientOpts>

    constructor({ source, auth, config, auth_key, source_file, ...opts }: FilelibClientOpts & { auth?: Auth }) {
        super({ config })
        this.auth = auth ?? new Auth({ source, auth_key, source_file } as AuthOptions)
        this.files = []
        this.config = config
        this.opts = { ...defaultOpts, ...opts }
        console.log("BROWSER CLIENT INIT WITH auth", this.auth)
    }

    add_file({ file, config, onProgress, onSuccess }: UploaderOpts) {
        if (!config && !this.config) {
            throw new FileConfigRequiredError("Config must be provided for file.")
        }

        // this.files.push(file)
        const _file = new FileReader().openFile(file.data, file.size)
        const metadata = {
            name: file.name,
            size: file.size,
            type: file.type
        }

        this.files.push(
            new Uploader({
                file: _file,
                config: config ?? this.config!,
                auth: this.auth,
                metadata,
                onProgress,
                onSuccess,
                storage: new Storage("filelib")
            })
        )
    }

    /**
     * Check if at the time this is called, we can make perform uploads.
     */
    canUpload(): boolean {
        if (!this.files || this.files.length < 1) {
            return false
        }
        return true
    }

    upload() {
        if (this.files.length === 0) throw new NoFileToUploadError("No Files to upload")
        // this.files.forEach((uploader) => uploader.upload())

        const groupedUploads = groupArray<Uploader>(this.files, this.opts.parallelUploads)
        console.log("GROUPED UPLOADS", groupedUploads)
        for (const uploads of groupedUploads) {
            Promise.allSettled(
                uploads.map(async (u) => {
                    await u.upload()
                })
            ).then((results) => console.log("PROMISE POOL SETTLEMENT", results))
        }
    }
}
