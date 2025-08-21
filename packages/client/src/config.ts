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
        this.validateConfig()
    }

    validateConfig() {
        this.#validateStorage()
        this.#validatePrefix()
        this.#validateAccess()
    }

    #validateStorage() {
        if (!this.storage) throw new ConfigValidationError("storage option must be provided.")
    }

    #validatePrefix() {
        if (!this.prefix) return true
        if (typeof this.prefix !== "string") throw new ConfigValidationError("prefix option must be a string.")

        // Define accepted characters more explicitly
        const acceptedChars = new Set([
            "-",
            "_",
            "/",
            ".",
            ...Array.from({ length: 10 }, (_, i) => i.toString()),
            ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)), // a-z
            ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)) // A-Z
        ])

        for (const char of this.prefix) {
            if (!acceptedChars.has(char)) {
                throw new ConfigValidationError(`Unsupported character in prefix: ${char}`)
            }
        }
        return true
    }
    #validateAccess() {
        if (!this.access) throw new ConfigValidationError("access option must be provided.")
        if (!configAccessOptions.includes(this.access))
            throw new ConfigValidationError("Unsupported access configuration value: " + this.access)
    }

    toHeaders() {
        return {
            [CONFIG_STORAGE_HEADER]: this.storage,
            [CONFIG_PREFIX_HEADER]: this.prefix,
            [CONFIG_ACCESS_HEADER]: this.access
        }
    }
}
