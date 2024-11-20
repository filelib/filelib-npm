import { CONFIG_ACCESS_HEADER, CONFIG_PREFIX_HEADER, CONFIG_STORAGE_HEADER } from "./constants"
import { ConfigOpts } from "./types"
import { ConfigValidationError } from "./exceptions"

const configAccessOptions: string[] = ["private"]

/**
 * Create configuration for each file that is being uploaded.
 *
 * Create configuration for each file that is being uploaded.
 * - storage: this is the target storage option created in Filelib Dashboard.
 *    This is where the file will be uploaded to.
 * */

export default class Config {
    storage: string
    prefix: string = ""
    access: string = "private"

    /**
     * Create configuration for each file that is being uploaded.
     *
     * Create configuration for each file that is being uploaded.
     * - storage: this is the target storage option created in Filelib Dashboard.
     *    This is where the file will be uploaded to.
     * */
    constructor({ storage, prefix = "", access = "private" }: ConfigOpts) {
        this.storage = storage
        this.prefix = prefix
        this.access = access
        this.validate_config()
    }

    validate_config() {
        this.#validate_storage()
        this.#validate_prefix()
        this.#validate_access()
    }
    #validate_storage() {
        if (!this.storage) throw new ConfigValidationError("storage option must be provided.")
    }

    #validate_prefix() {
        if (!this.prefix) return true
        if (typeof this.prefix !== "string") throw new ConfigValidationError("prefix option must be a string.")
        const acceptedChars = ["-", "_", "/", ...Array(10).keys()]
        for (let i = 32; i <= 127; i++) {
            acceptedChars.push(String.fromCharCode(i))
        }

        this.prefix.split("").forEach((c) => {
            if (!acceptedChars.includes(c)) {
                throw new ConfigValidationError("Unsupported character in prefix: " + c)
            }
        })
        return true
    }
    #validate_access() {
        if (!this.access) throw new ConfigValidationError("access option must be provided.")
        if (!configAccessOptions.includes(this.access))
            throw new ConfigValidationError("Unsupported access configuration value: " + this.access)
    }

    to_headers() {
        return {
            [CONFIG_STORAGE_HEADER]: this.storage,
            [CONFIG_PREFIX_HEADER]: this.prefix,
            [CONFIG_ACCESS_HEADER]: this.access
        }
    }
}
