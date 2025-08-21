import { FileConfigRequiredError, FileIDDuplicateError, NoFileToUploadError } from "../exceptions"
import { FilelibClientOpts, UploaderOpts } from "../types"
import Auth from "./auth"
import Config from "../config"
import { groupArray } from "@justinmusti/utils"
import Uploader from "../uploader"

export const defaultClientOpts = {
    limit: 20,
    parallelUploads: 5,
    abortOnFail: false,
    useCache: true,
    clearCache: false
} as FilelibClientOpts

export default abstract class BaseClient {
    auth: Auth
    config?: Config
    files!: Uploader[]
    opts: Partial<FilelibClientOpts>

    constructor() {
        this.files = []
    }

    /**
     * Add a file to the list of file to be uploaded.
     * @param props
     */
    abstract addFile(props: unknown): void

    /**
     * Remove a previously added file from the queue.
     * @param { UploaderOpts} props
     */
    removeFile({ id }: Pick<UploaderOpts, "id">): void {
        const fileIndex = this.files.findIndex((x) => x.id === id)
        if (fileIndex > -1) {
            this.files[fileIndex]?.abort("Upload terminated: File is removed by user.")
            this.files.splice(fileIndex, 1)
        }
    }

    validateAddFile({ id, config }: Pick<UploaderOpts, "id"> & { config?: Config | string }) {
        // Ensure config exits.
        if (!config && !this.config) {
            throw new FileConfigRequiredError("Config must be provided for file.")
        }

        // Check if there is a duplicate file
        if (this.files.length > 0 && id && this.files.find((x) => x.id === id)) {
            throw new FileIDDuplicateError(`A file with the same id: ${id} is already added.`)
        }
    }

    /**
     * Check if at the time this is called, we can make perform uploads.
     */
    canUpload({ raise_exp = true }: { raise_exp: boolean }): boolean {
        // Check if authentication details are set.
        if (!this.auth) {
            if (raise_exp) throw new Error("No authentication details provided.")
            return false
        }
        // Check if there are files added.
        if (!this.files || this.files.length < 1) {
            if (raise_exp) throw new NoFileToUploadError("No Files to upload")
            return false
        }
        //
        return true
    }

    /**
     * Start the upload process after verifying all prerequisites.
     */
    upload() {
        this.canUpload({ raise_exp: true })
        this.auth
            .getAccessToken()
            .then(() => {
                const groupedUploads = groupArray<Uploader>(this.files, this.opts.parallelUploads)

                for (const uploads of groupedUploads) {
                    Promise.allSettled(
                        uploads.map((u) => {
                            return new Promise((resolve) => {
                                return resolve(u.upload())
                            })
                        })
                    )
                }
            })
            .catch((e) => {
                this.opts.onError(e)
            })
    }
}
