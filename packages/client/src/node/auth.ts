/**
 * Authenticate with FileLib API
 * */
import * as ini from "ini"
import * as jose from "jose"
import { accessSync, constants, readFileSync } from "node:fs"
import {
    AuthEnvVariableMissingError,
    AuthSourceError,
    AuthSourceFileDataError,
    AuthSourceFileDoesNotExistError,
    AuthSourceFileValueMissingError,
    FilelibAPIResponseError
} from "../exceptions"
import {
    AUTHORIZATION_HEADER,
    CREDENTIAL_SOURCE_ENV,
    CREDENTIAL_SOURCE_FILE,
    CREDENTIAL_SOURCE_OPTIONS,
    ENV_API_KEY_IDENTIFIER,
    ENV_API_SECRET_IDENTIFIER,
    FILELIB_API_AUTH_URL
} from "../constants"
import { AuthOptions } from "../types"
import { default as BaseAuth } from "../blueprints/auth"
import { randomUUID } from "crypto"

export default class Auth extends BaseAuth {
    protected source: string
    protected source_file: AuthOptions["source_file"]
    protected auth_secret!: AuthOptions["auth_secret"]

    /**
     * Initialize an Auth instance that will handle authentication with Filelib API.
     * @param source {string} - Indicate where the Filelib credentials are located.
     * @param authKey {string} - Pass credential key directly.
     * @param auth_secret {string} - Pass Credential secret directly.
     * @param source_file {string} - Path to the file where credentials are located.
     */
    constructor({
        source = "file",
        authKey,
        auth_secret,
        source_file = "~/.filelib/credentials"
    }: AuthOptions & { source: string }) {
        super()
        this.source = source
        this.authKey = authKey
        this.auth_secret = auth_secret
        this.source_file = source_file

        if (!!authKey && !!auth_secret) {
            this.authKey = authKey
            this.auth_secret = auth_secret
        } else {
            this.#parse_credentials()
        }
    }

    #parse_credentials() {
        if (!this.auth_secret || !this.authKey) {
            if (!CREDENTIAL_SOURCE_OPTIONS.includes(this.source)) {
                throw new AuthSourceError(
                    `Unsupported authentication source option. Must be one of: ${CREDENTIAL_SOURCE_OPTIONS.join(", ")}`
                )
            }
        }
        if (this.source === CREDENTIAL_SOURCE_ENV) {
            this.#parse_credentials_from_env()
        } else if (this.source === CREDENTIAL_SOURCE_FILE) {
            this.#parse_credentials_from_file()
        }
    }

    #parse_credentials_from_file(): void {
        // console.log("PARSING CREDS FROM FILE", this.source_file)
        if (!this.source_file) {
            throw new AuthSourceFileValueMissingError("'source_file' must have a value")
        }
        // Check if file exists
        try {
            accessSync(this.source_file, constants.R_OK)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err: unknown) {
            throw new AuthSourceFileDoesNotExistError(
                `Filelib credentials file does not exist on given path: ${this.source_file}`
            )
        }

        // Read file and parse contents
        const credentialsPayload = readFileSync(this.source_file, { encoding: "utf8" })
        if (!credentialsPayload) throw new AuthSourceFileDataError("Credentials file cannot be empty")
        const creds = ini.parse(credentialsPayload)
        if (!creds?.filelib) throw new AuthSourceFileDataError("Credentials file does not have `filelib` section")
        // console.log("CREDENTIALS INI", creds)
        const { api_key, api_secret } = creds.filelib
        // console.log("FILE ACWORED CREDS", api_key, api_secret)
        this.authKey = api_key
        this.auth_secret = api_secret
        // console.log("PASSED ASSSIUGNMENT", this.authKey, this.auth_secret)
    }

    /**
     * Check environment variables to see if the credentials are available.
     * */
    #parse_credentials_from_env() {
        if (!(`${ENV_API_KEY_IDENTIFIER}` in process.env)) {
            throw new AuthEnvVariableMissingError(`${ENV_API_KEY_IDENTIFIER} must be present in env`)
        }
        if (!(`${ENV_API_SECRET_IDENTIFIER}` in process.env)) {
            throw new AuthEnvVariableMissingError(`${ENV_API_SECRET_IDENTIFIER} must be present in env`)
        }
        this.authKey = process.env[ENV_API_KEY_IDENTIFIER]
        this.auth_secret = process.env[ENV_API_SECRET_IDENTIFIER]
    }

    async #getJWTToken(): Promise<string> {
        // console.log("SINGING TOKEN WITH CREDS", this.authKey, this.auth_secret)
        const payload = {
            api_key: this.authKey,
            nonce: randomUUID(),
            request_client_source: "js_filelib"
        }
        const secret = new TextEncoder().encode(this.auth_secret)
        const alg = "HS256"

        return await new jose.SignJWT(payload)
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime("2h")
            .sign(secret)
    }

    public async acquire_access_token(): Promise<string> {
        // console.log("ACQUIRING ACCESS TOKEN")
        if (!this.authKey || !this.auth_secret) {
            this.#parse_credentials()
        }
        const token = await this.#getJWTToken()
        // console.log("JSONWEBTOKEN HERE LOOK HERE:", token)
        const headers = {
            Authorization: `Bearer ${token}`
        }
        // console.log("AUTH URL", FILELIB_API_AUTH_URL)
        const response = await fetch(FILELIB_API_AUTH_URL, { method: "POST", headers })
        const { status, data, error } = await response.json()
        /*
         * {
             api_key: '6fe1ed21-165e-41e8-8abb-d5bc9953caf2',
             access_token: 'bbbe1f3e-5afa-4013-a4c4-803c74aa2646-vwxJRCZo5Dv4qg9ERDVIJ7Lx7vQEhhw5K0lM',
             expires_in: 12000,
             expiration: '2024-08-06 00:45:06+0000'
            }
         * */
        if (!status) throw new FilelibAPIResponseError(error)
        this.access_token = data.access_token!
        this.expiration = new Date(data.expiration)
        return data.access_token as string
    }

    is_access_token(): boolean {
        return !!this.access_token
    }

    is_expired(): boolean {
        return this.expiration && this.expiration < new Date()
    }

    async get_access_token(): Promise<string> {
        if (!this.access_token) {
            await this.acquire_access_token()
        }
        return this.access_token
    }

    async to_headers() {
        return {
            [AUTHORIZATION_HEADER]: `Bearer ${await this.get_access_token()}`
        }
    }
}
