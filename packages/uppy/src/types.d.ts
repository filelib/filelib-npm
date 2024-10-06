// import { Body, Meta } from "@uppy/utils/lib/UppyFile"
import { Config } from "@filelib/client"
import { FilelibClientOpts } from "@filelib/client/types"
import { FilelibFile } from "@filelib/client/types"
import { PluginOpts } from "@uppy/core/lib/BasePlugin"

export interface MetaData {
    [key: string]: string
}

// export interface FilelibUppyOpts<M extends Meta, B extends Body> extends PluginOpts {
export interface FilelibUppyOpts extends FilelibClientOpts, PluginOpts {
    // export interface FilelibUppyOpts extends PluginOpts {
    authKey: string // Filelib credentials Auth/API key
    metadata?: MetaData
    config?: Config
    parallelUploads?: number
    limit?: number
    ignoreCache: boolean
    abortOnFail: boolean
    clearCache: boolean
    chunkSize: number

    onProgress?: ((bytesSent: number, bytesTotal: number) => void) | null
    onChunkComplete?: ((chunkSize: number, bytesAccepted: number, bytesTotal: number) => void) | null
    onSuccess?: ((file: FilelibFile) => void) | null
    onError?: ((error: Error) => void) | null
    onShouldRetry?: ((error: Error, retryAttempt: number) => boolean) | null
    headers?: { [key: string]: string }
}
