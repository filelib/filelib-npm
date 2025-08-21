/**
 * Client Object that communicates with Filelib API.
 *
 * */
import * as path from "path"
import { AuthOptions, FilelibClientOpts, UploaderOpts } from "../types"
import {
    ClientAuthRequiredError,
    ClientConfigRequiredError,
    ConfigValidationError,
    FileDoesNotExistError
} from "../exceptions"
import Auth from "./auth"
import BaseClient from "../blueprints/client"
import Config from "../config"
import { defaultOpts } from "../browser/client"
import { existsSync } from "fs"
import { FileReader } from "./file_reader"
import Storage from "@justinmusti/storage/node"
import Uploader from "../uploader"

export default class Client extends BaseClient {
    auth: Auth
    config?: Config
    files!: Uploader[]

    /**
     * Initialize a Client instance that will handle file  with Filelib API.
     *
     * @param auth {Auth} - An Auth Instance.
     * @param config {Config|string} - Config Instance or storage string.
     * @param authKey {string} - Authentication key.
     * @param authSecret {string} - Authentication secret.
     * @param authOptions {AuthOptions} - Authentication options.
     * @param opts {FilelibClientOpts} - Filelib Client Options.
     */
    constructor({
        auth,
        config,
        authKey,
        authSecret,
        source,
        sourceFile,
        ...opts
    }: Omit<FilelibClientOpts, "auth" | "config"> & Partial<AuthOptions> & { auth?: Auth; config?: Config | string }) {
        super()
        // Handle config - can be Config instance or string
        if (!config) throw new ConfigValidationError("config details must be provided.")
        if (typeof config === "string") {
            this.config = new Config({ storage: config })
        } else {
            this.config = config as Config
        }

        // Validate authentication details.
        if (!auth && !authKey && !authSecret && !source && !sourceFile) {
            throw new ClientAuthRequiredError(
                "Authentication credentials are required. Provide either auth instance, authKey/authSecret or source"
            )
        }
        // Assign Auth details.
        if (auth && auth instanceof Auth) {
            this.auth = auth
        } else {
            this.auth = new Auth({ authKey, authSecret, sourceFile, source })
        }

        this.files = []
        this.opts = { ...defaultOpts, ...opts }
    }

    /**
     * Adds a file to the upload queue for processing
     *
     * This method validates the file path, extracts metadata from the file system,
     * and creates an Uploader instance to handle the upload process. The file
     * will be queued for upload when the upload() method is called.
     *
     * @param id {string} - Indicate file's id.
     * @param file {File} - Indicate where the Filelib credentials are located.
     * @param config {Config} - Indicate file's config.
     * @param metadata {MetaData} - Indicate file's metadata.
     * @param rest {string} - Others.
     */
    addFile({
        id,
        file,
        config,
        metadata,
        ...rest
    }: Omit<UploaderOpts, "auth" | "file" | "storage" | "config"> & { file: string; config?: Config | string }) {
        const uploaderOpts = { ...this.opts, ...rest }
        try {
            this.validateAddFile({ id, config })

            // Validate file path exists
            if (!existsSync(file)) {
                throw new FileDoesNotExistError("No file found at given path: " + file)
            }

            // Create file source for Uploader
            let finalConfig: Config
            if (typeof config === "string") {
                finalConfig = new Config({ storage: config })
            } else if (config) {
                finalConfig = config as Config
            } else if (this.config) {
                finalConfig = this.config
            } else {
                throw new ClientConfigRequiredError(
                    "Config is required. Provide either a config parameter or set config in the client constructor."
                )
            }

            // Create and add uploader to queue
            this.files.push(
                new Uploader({
                    id,
                    config: finalConfig,
                    file: new FileReader({ file, ...(metadata ?? {}) }),
                    auth: this.auth,
                    metadata,
                    storage: new Storage({ path: path.resolve(".", "filelib-storage.json"), prefix: "filelib" }),
                    ...uploaderOpts
                })
            )
        } catch (e) {
            uploaderOpts?.onError?.(metadata, e as Error)
        }
    }
}
