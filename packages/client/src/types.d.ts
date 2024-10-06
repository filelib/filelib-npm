import Auth from "./blueprints/auth"
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

export interface FilelibClientOpts extends Partial<AuthOptions> {
    // ignoreCache, abortOnFail, clearCache, chunkSize

    auth?: Auth
    source?: AuthOptions["source"]
    config?: Config
    parallelUploads?: number

    // export interface FilelibUppyOpts extends PluginOpts {
    authKey?: string // Filelib credentials Auth/API key
    metadata?: MetaData

    limit?: number
    ignoreCache?: boolean
    abortOnFail?: boolean
    clearCache?: boolean

    onProgress?: ((bytesSent: number, bytesTotal: number) => void) | null
    onChunkComplete?: ((chunkSize: number, bytesAccepted: number, bytesTotal: number) => void) | null
    onSuccess?: ((file: FilelibFile) => void) | null
    onError?: ((error: Error) => void) | null
    onShouldRetry?: ((error: Error, retryAttempt: number) => boolean) | null
    headers?: { [key: string]: string }
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
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void
    onSuccess?: (file: FilelibFile) => void
    storage: Storage
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
