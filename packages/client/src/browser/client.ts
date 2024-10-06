/**
 * Client Object that communicates with Filelib API.
 *
 * */
import { AuthOptions, FilelibClientOpts, UploaderOpts } from "../types"

import Auth from "./auth"
import BaseClient from "../blueprints/client"
import Config from "../config"
import { FileConfigRequiredError } from "../exceptions"
import { default as FileReader } from "tus-js-client/lib/browser/fileReader"
import Storage from "@justinmusti/storage/browser"
import Uploader from "../uploader"

const defaultOpts: Partial<FilelibClientOpts> = {
    parallelUploads: 5,
    limit: 20,
    ignoreCache: false,
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
        console.log("BROWSER CLIENT INIT WITH auth", this.auth)
    }

    addFile({
        id,
        file,
        config,
        onProgress,
        onSuccess,
        metadata,
        ...rest
    }: {
        id: UploaderOpts["id"]
        file: File
        config?: Config
        onProgress?: UploaderOpts["onProgress"]
        onSuccess?: UploaderOpts["onSuccess"]
        metadata?: UploaderOpts["metadata"]
    }) {
        console.log("ADDING FILE FOR BROWSER CLIENT", file)
        if (!config && !this.config) {
            throw new FileConfigRequiredError("Config must be provided for file.")
        }
        console.log(
            "ID",
            id,
            this.files.find((x) => x.id === id)
        )
        if (id && this.files.find((x) => x.id === id)) return

        const _file = new FileReader().openFile(file, metadata.size)
        console.log("PUSHING TO LIST")
        this.files.push(
            new Uploader({
                id,
                file: _file,
                config: config ?? this.config!,
                auth: this.auth,
                metadata,
                onProgress,
                onSuccess,
                storage: new Storage(),
                ...rest
            })
        )
    }
}
