/**
 * Client Object that communicates with Filelib API.
 *
 * */
import { AuthOptions, FilelibClientOpts, UploaderOpts } from "../types"

import Auth from "./auth"
import BaseClient from "../blueprints/client"
import Config from "../config"
import { default as FileReader } from "tus-js-client/lib/browser/fileReader"
import Storage from "@justinmusti/storage/browser"
import Uploader from "../uploader"

export const defaultOpts: Partial<FilelibClientOpts> = {
    parallelUploads: 5,
    limit: 20,
    useCache: true,
    abortOnFail: true,
    clearCache: false
}

export default class Client extends BaseClient {
    auth: Auth
    config?: Config
    files!: Uploader[]
    opts: Partial<FilelibClientOpts>

    constructor({ source, auth, config, authKey, source_file, ...opts }: FilelibClientOpts & { auth?: Auth }) {
        super()
        this.auth = auth ?? new Auth({ source, authKey, source_file } as AuthOptions)
        this.files = []
        this.config = config
        this.opts = { ...defaultOpts, ...opts }
    }

    addFile({ id, file, config, metadata, ...rest }: Omit<UploaderOpts, "auth" | "file" | "storage"> & { file: File }) {
        const uploaderOpts = { ...this.opts, ...rest }
        try {
            this.validateAddFile({ id, config })

            const _file = new FileReader().openFile(file, metadata.size)
            this.files.push(
                new Uploader({
                    id,
                    file: _file,
                    config: config ?? this.config!,
                    auth: this.auth,
                    metadata,
                    storage: new Storage({ prefix: "filelib" }),
                    ...uploaderOpts
                })
            )
        } catch (e) {
            uploaderOpts?.onError(metadata, e)
        }
    }
}
