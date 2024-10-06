/**
 * Client Object that communicates with Filelib API.
 *
 * */
import * as path from "path"
import { FileConfigRequiredError, FileDoesNotExistError } from "../exceptions"
import Auth from "./auth"
import Config from "../config"
import { existsSync } from "fs"
import { FilelibClientOpts } from "../types"
import { default as FileReader } from "tus-js-client/lib/node/fileReader"
import { randomUUID } from "crypto"
import { statSync } from "node:fs"
import Storage from "@justinmusti/storage/node"
import Uploader from "../uploader"

interface AddFileOpts {
    file: string | File
    config?: Config
}
export default class Client {
    auth: Auth
    config?: Config
    files!: Uploader[]

    constructor({ source, auth, config, authKey, auth_secret, source_file }: FilelibClientOpts & { auth?: Auth }) {
        this.auth = auth ?? new Auth({ source, authKey, auth_secret, source_file })
        this.files = []
        this.config = config
    }

    add_file({ file, config }: AddFileOpts) {
        if (!config && !this.config) {
            throw new FileConfigRequiredError("Config must be provided for file.")
        }
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
                    file: _file,
                    config: config ?? this.config!,
                    id: randomUUID(),
                    auth: this.auth,
                    metadata,
                    storage: new Storage({ path: ".", prefix: "" })
                })
            )
        }
    }
}
