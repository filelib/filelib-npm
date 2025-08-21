/**
 * Authenticate with FileLib API
 * */
import * as ini from "ini"
import * as jose from "jose"
import { accessSync, constants, readFileSync } from "node:fs"
import {
    AuthEnvVariableMissingError,
    AuthInvalidCredentialFormatError,
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
import { validate as isValidUUID } from "uuid"
import { randomUUID } from "crypto"

export default class Auth extends BaseAuth {
    protected source: AuthOptions["source"]
    protected sourceFile: AuthOptions["sourceFile"]
    protected authSecret!: AuthOptions["authSecret"]

    /**
     * Initialize an Auth instance that will handle authentication with Filelib API.
     * @param source {string} - Indicate where the Filelib credentials are located.
     * @param authKey {string} - Pass credential key directly.
     * @param authSecret {string} - Pass Credential secret directly.
     * @param sourceFile {string} - Path to the file where credentials are located.
     */
    constructor({ source, authKey, authSecret, sourceFile = "~/.filelib/credentials" }: AuthOptions) {
        super()
        this.source = source
        this.authKey = authKey
        this.authSecret = authSecret
        this.sourceFile = sourceFile

        // Validate that either source is provided OR both authKey and authSecret are provided
        const hasDirectCredentials = !!authKey && !!authSecret
        const hasSource = !!source
        const hasPartialCredentials = (!!authKey && !authSecret) || (!authKey && !!authSecret)

        if (!hasSource && !hasDirectCredentials) {
            throw new AuthSourceError("Either source or authKey and authSecret must be provided")
        }

        // If partial credentials are provided without a source, throw an error
        if (hasPartialCredentials && !hasSource) {
            throw new AuthSourceError("Both authKey and authSecret must be provided when not using a source")
        }

        if (hasDirectCredentials) {
            this.#validateCredentials({ authKey, authSecret })
            this.authKey = authKey
            this.authSecret = authSecret
        } else {
            this.#parseCredentials()
        }
    }

    #validateCredentials({ authKey, authSecret }: Pick<AuthOptions, "authKey" | "authSecret">): void {
        if (!isValidUUID(authKey)) {
            throw new AuthInvalidCredentialFormatError("authKey is not a valid UUID")
        }

        if (!isValidUUID(authSecret)) {
            throw new AuthInvalidCredentialFormatError("authSecret is not a valid UUID")
        }
    }

    #parseCredentials() {
        if (!this.authSecret || !this.authKey) {
            if (!CREDENTIAL_SOURCE_OPTIONS.includes(this.source)) {
                throw new AuthSourceError(
                    `Unsupported authentication source option. Must be one of: ${CREDENTIAL_SOURCE_OPTIONS.join(", ")}`
                )
            }
        }
        if (this.source === CREDENTIAL_SOURCE_ENV) {
            this.#parseCredentialsFromEnv()
        } else if (this.source === CREDENTIAL_SOURCE_FILE) {
            this.#parseCredentialsFromFile()
        }
    }

    #parseCredentialsFromFile(): void {
        if (!this.sourceFile) {
            throw new AuthSourceFileValueMissingError("'source_file' must have a value")
        }
        // Check if file exists
        try {
            accessSync(this.sourceFile, constants.R_OK)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err: unknown) {
            throw new AuthSourceFileDoesNotExistError(
                `Filelib credentials file does not exist on given path: ${this.sourceFile}`
            )
        }

        // Read file and parse contents
        const credentialsPayload = readFileSync(this.sourceFile, { encoding: "utf8" })
        if (!credentialsPayload) throw new AuthSourceFileDataError("Credentials file cannot be empty")
        const creds = ini.parse(credentialsPayload)
        if (!creds?.filelib) throw new AuthSourceFileDataError("Credentials file does not have `filelib` section")
        const { api_key, api_secret } = creds.filelib
        this.#validateCredentials({ authKey: api_key, authSecret: api_secret })
        this.authKey = api_key
        this.authSecret = api_secret
    }

    /**
     * Check environment variables to see if the credentials are available.
     * */
    #parseCredentialsFromEnv() {
        if (!(`${ENV_API_KEY_IDENTIFIER}` in process.env)) {
            throw new AuthEnvVariableMissingError(`${ENV_API_KEY_IDENTIFIER} must be present in env`)
        }
        if (!(`${ENV_API_SECRET_IDENTIFIER}` in process.env)) {
            throw new AuthEnvVariableMissingError(`${ENV_API_SECRET_IDENTIFIER} must be present in env`)
        }
        const authKey = process.env[ENV_API_KEY_IDENTIFIER]
        const authSecret = process.env[ENV_API_SECRET_IDENTIFIER]
        this.#validateCredentials({ authKey, authSecret })
        this.authKey = authKey
        this.authSecret = authSecret
    }

    async #getJWTToken(): Promise<string> {
        const payload = {
            api_key: this.authKey,
            nonce: randomUUID(),
            request_client_source: "js_filelib"
        }
        const secret = new TextEncoder().encode(this.authSecret)
        const alg = "HS256"

        return await new jose.SignJWT(payload)
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime("2h")
            .sign(secret)
    }

    public async acquireAccessToken(): Promise<string> {
        if (!this.authKey || !this.authSecret) {
            this.#parseCredentials()
        }
        const token = await this.#getJWTToken()
        const headers = {
            Authorization: `Bearer ${token}`
        }
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
        this.accessToken = data.access_token!
        this.expiration = new Date(data.expiration)
        return data.access_token as string
    }

    isAccessToken(): boolean {
        if (this.isExpired()) {
            return false
        }
        return !!this.accessToken
    }

    isExpired(): boolean {
        return this.expiration && this.expiration < new Date()
    }

    async getAccessToken(): Promise<string> {
        if (!this.accessToken) {
            await this.acquireAccessToken()
        }
        return this.accessToken
    }

    async toHeaders() {
        return {
            [AUTHORIZATION_HEADER]: `Bearer ${await this.getAccessToken()}`
        }
    }
}
