import Auth from "./blueprints/auth"
import { BaseError } from "./exceptions"
import Config from "./config"
import { CREDENTIAL_SOURCE_OPTIONS } from "./constants"
import { FileSource } from "tus-js-client"
import { Storage } from "@justinmusti/storage"

export interface AuthOptions {
    source: (typeof CREDENTIAL_SOURCE_OPTIONS)[number]
    authKey?: string
    auth_secret?: string
    source_file?: string
}

export interface FilelibClientOptionsEventHandlers {
    onProgress?: ((bytesSent: number, bytesTotal: number) => void) | null
    onChunkComplete?: ((chunkSize: number, bytesAccepted: number, bytesTotal: number) => void) | null
    onSuccess?: ((file: FilelibFile) => void) | null
    onError?: ((fileMetadata: MetaData, error: InstanceType<BaseError | Error>) => void) | null
    onRetry?: ((error: Error, retryAttempt: number) => boolean) | null
}

export interface FilelibClientOpts extends Partial<AuthOptions>, FilelibClientOptionsEventHandlers {
    // ignoreCache, abortOnFail, clearCache, chunkSize

    auth?: Auth
    source?: AuthOptions["source"]
    config?: Config
    parallelUploads?: number
    headers?: { [key: string]: string }

    authKey?: string // Filelib credentials Auth/API key
    metadata?: MetaData

    limit?: number
    ignoreCache?: boolean
    abortOnFail?: boolean
    clearCache?: boolean
}

interface ConfigOpts {
    storage: string
    prefix?: string
    access?: string
}

export type FileLike = string | File

export interface ApiResponse<T> {
    status: boolean
    error: null | string
    data: T
}

export interface MetaData {
    name: string
    size: number
    type: string
}

export interface KeyMap {
    [key: string | number | symbol]: unknown
}

export interface FilelibFile {
    id: string
    name: string
    mimetype: string
    size: number
    key: string
    prefix: string
    access: string
    storage: string
    protocol: string
    status: string
    created_at: string
}

export interface UploaderOpts {
    id: string
    file: Promise<FileSource>
    config: Config
    auth: Auth
    metadata: MetaData
    workers?: number
    storage: Storage
    // Callbacks
    onSuccess?: (file: FilelibFile) => void
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void
    onError?: FilelibClientOpts["onError"]
    // Caching options
    useCache?: boolean // defaults to true.
    clearCacheOnSuccess?: boolean // defaults to false
    clearCacheOnError?: boolean // defaults to false
}

export interface MetaData {
    name: string
    size: number
    type: string
}

export interface UploadUrlMap {
    [key: string | number | symbol]: {
        log_url: string
        method: string
        part_number: number
        url: string
        platform: string
    }
}
