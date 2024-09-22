import Auth from "./blueprints/auth"
import Config from "./config"
import { CREDENTIAL_SOURCE_OPTIONS } from "./constants"
import { FileSource } from "tus-js-client"
import { Storage } from "@justinmusti/storage"

export interface AuthOptions {
    source: (typeof CREDENTIAL_SOURCE_OPTIONS)[number]
    auth_key?: string
    auth_secret?: string
    source_file?: string
}

export interface FilelibClientOpts extends Partial<AuthOptions> {
    auth?: Auth
    source?: AuthOptions["source"]
    config?: Config
    parallelUploads?: number
}

interface ConfigOpts {
    storage: string
    prefix: string
    access: string
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
    // file: string | (File | MetaData)
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
