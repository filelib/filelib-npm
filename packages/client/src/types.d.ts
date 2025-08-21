import Auth from "./blueprints/auth"
import { BaseError } from "./exceptions"
import Config from "./config"
import { CREDENTIAL_SOURCE_TYPES } from "./constants"
import { FileReader } from "./blueprints/file_reader"
import { Storage } from "@justinmusti/storage"

export type CredentialSource = (typeof CREDENTIAL_SOURCE_TYPES)[number]

export interface AuthOptions {
    source?: CredentialSource
    authKey?: string
    authSecret?: string
    sourceFile?: string
}

export interface FilelibClientOptionsEventHandlers {
    onProgress?: ((bytesSent: number, bytesTotal: number) => void) | null
    onChunkComplete?: ((chunkSize: number, bytesAccepted: number, bytesTotal: number) => void) | null
    onSuccess?: ((file: FilelibFile) => void) | null
    onError?: ((error: InstanceType<BaseError | Error>) => void) | null
    onRetry?: ((error: Error, retryAttempt: number) => boolean) | null
}

export interface FilelibClientOpts extends FilelibClientOptionsEventHandlers {
    auth?: Auth
    authKey?: AuthOptions["authKey"]
    authSecret?: AuthOptions["authSecret"]
    config?: Config
    parallelUploads?: number
    headers?: { [key: string]: string }

    metadata?: MetaData

    limit?: number
    useCache?: boolean
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
    file: FileReader
    config: Config
    auth: Auth
    metadata: MetaData
    workers?: number
    storage: Storage
    // Callbacks
    onSuccess?: (file: FilelibFile) => void
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void
    onError?: ((fileMetadata: MetaData, error: InstanceType<BaseError | Error>) => void) | null
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

export interface CachePayload {
    hash: number
    metaData: MetaData
    uploadURL: string
    creationTime: string
}
