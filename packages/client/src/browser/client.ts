/**
 * Client Object that communicates with Filelib API.
 *
 * */

import { ClientAuthRequiredError, ClientConfigRequiredError } from "../exceptions"
import { FilelibClientOpts, UploaderOpts } from "../types"
import Auth from "./auth"
import BaseClient from "../blueprints/client"
import Config from "../config"
import FileReader from "./file_reader"
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

    constructor({
        auth,
        config,
        authKey,
        ...opts
    }: Omit<FilelibClientOpts, "config"> & { auth?: Auth; config?: Config | string }) {
        super()

        // Validate that either auth instance or authKey/authSecret are provided
        if (!auth && !authKey) {
            throw new ClientAuthRequiredError(
                "Authentication credentials are required. Provide either auth instance, authKey/authSecret, or authOptions"
            )
        }
        this.auth = auth && auth instanceof Auth ? auth : new Auth({ authKey })

        // Handle config - can be Config instance or string
        if (config) {
            if (typeof config === "string") {
                this.config = new Config({ storage: config })
            } else {
                this.config = config
            }
        }

        this.files = []
        this.opts = { ...defaultOpts, ...opts }
    }

    addFile({
        id,
        file,
        config,
        metadata,
        ...rest
    }: Omit<UploaderOpts, "auth" | "file" | "storage" | "config"> & { file: File; config?: Config | string }) {
        const uploaderOpts = { ...this.opts, ...rest }

        try {
            this.validateAddFile({ id, config })

            // Handle config - can be Config instance or string
            if (!config && !this.config)
                throw new ClientConfigRequiredError(
                    "Config is required. Provide either a config parameter or set config in the client constructor."
                )

            if (config) {
                config = typeof config === "string" ? new Config({ storage: config }) : config
            } else {
                config = this.config as Config
            }

            this.files.push(
                new Uploader({
                    id,
                    file: new FileReader({ file, ...(metadata ?? {}) }),
                    config: config,
                    auth: this.auth,
                    metadata,
                    storage: new Storage({ prefix: "filelib" }),
                    ...uploaderOpts
                })
            )
        } catch (e) {
            uploaderOpts?.onError?.(metadata, e as Error)
        }
    }
}
