import { FilelibClientOpts } from "@filelib/client/types"
import { PluginOpts } from "@uppy/core/lib/BasePlugin"

export interface FilelibUppyOpts extends FilelibClientOpts, PluginOpts {
    authKey: FilelibClientOpts["authKey"] // Filelib credentials Auth/API key
    metadata?: FilelibClientOpts["metadata"]
    config?: FilelibClientOpts["config"]
    parallelUploads?: FilelibClientOpts["parallelUploads"]
    limit?: FilelibClientOpts["limit"]
    ignoreCache: FilelibClientOpts["ignoreCache"]
    abortOnFail: FilelibClientOpts["abortOnFail"]
    clearCache: FilelibClientOpts["clearCache"]

    onProgress?: FilelibClientOpts["onProgress"]
    onChunkComplete?: FilelibClientOpts["onChunkComplete"]
    onSuccess?: FilelibClientOpts["onSuccess"]
    onError?: FilelibClientOpts["onError"]
    onRetry?: FilelibClientOpts["onRetry"]
    headers?: FilelibClientOpts["headers"]
}
