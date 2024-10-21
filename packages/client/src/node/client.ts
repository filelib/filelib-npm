/**
 * Client Object that communicates with Filelib API.
 *
 * */
import * as path from "path"
import { FilelibClientOpts, UploaderOpts } from "../types"
import Auth from "./auth"
import BaseClient from "../blueprints/client"
import Config from "../config"
import { existsSync } from "fs"
import { FileDoesNotExistError } from "../exceptions"
import { default as FileReader } from "tus-js-client/lib/node/fileReader"
import { statSync } from "node:fs"
import Storage from "@justinmusti/storage/node"
import Uploader from "../uploader"

export default class Client extends BaseClient {
    auth: Auth
    config?: Config
    files!: Uploader[]

    constructor({ source, auth, config, authKey, auth_secret, source_file }: FilelibClientOpts & { auth?: Auth }) {
        super()
        this.auth = auth ?? new Auth({ source, authKey, auth_secret, source_file })
        this.files = []
        this.config = config
    }

    addFile({ id, file, config }: UploaderOpts) {
        this.validateAddFile({ id, config })

        // Get file from the path
        if (typeof file == "string") {
            if (!existsSync(file)) {
                throw new FileDoesNotExistError("No file found at given path: " + file)
            }

            console.log("ADDING FILE INFO", statSync(file))
            console.log("ADDING FILE PATH BASENAME ", path.basename(file))
            console.log("ADDING FILE PATH EXTNAME ", path.extname(file))

            const metadata = {
                name: path.basename(file),
                size: statSync(file).size,
                type: ""
            }

            const _file = new FileReader().openFile(file, metadata.size)
            this.files.push(
                new Uploader({
                    id,
                    file: _file,
                    config: config ?? this.config!,
                    auth: this.auth,
                    metadata,
                    storage: new Storage({ path: ".", prefix: "filelib" })
                })
            )
        }
    }
}
