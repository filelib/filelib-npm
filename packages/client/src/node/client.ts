/**
 * Client Object that communicates with Filelib API.
 *
 * */
import * as path from "path"
import { FileConfigRequiredError, FileDoesNotExistError, NoFileToUploadError } from "../exceptions"
import { readFileSync, statSync } from "node:fs"
import Auth from "./auth"
import Config from "../config"
import { existsSync } from "fs"
import { FilelibClientOpts } from "../types"
import Uploader from "../uploader"

interface AddFileOpts {
    file: string | File
    config?: Config
}
export default class Client {
    auth: Auth
    config?: Config
    files!: Uploader[]

    constructor({ source, auth, config, auth_key, auth_secret, source_file }: FilelibClientOpts & { auth?: Auth }) {
        this.auth = auth ?? new Auth({ source, auth_key, auth_secret, source_file })
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
            const fileObject = readFileSync(file)
            fileObject.name = path.basename(file)
            fileObject.size = statSync(file).size
            fileObject.type = statSync(file).type
            this.files.push(new Uploader({ file: fileObject, config: config ?? this.config!, auth: this.auth }))
        }
    }

    upload() {
        if (this.files.length === 0) throw new NoFileToUploadError("No Files to upload")
        this.files.forEach((uploader) => void uploader.upload())
    }
}
