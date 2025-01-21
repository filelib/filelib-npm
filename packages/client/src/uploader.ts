import {
    FILELIB_API_UPLOAD_URL,
    MAX_CHUNK_SIZE,
    MIN_CHUNK_SIZE,
    UPLOAD_CHUNK_SIZE_HEADER,
    UPLOAD_COMPLETED,
    UPLOAD_MAX_CHUNK_SIZE_HEADER,
    UPLOAD_MIN_CHUNK_SIZE_HEADER,
    UPLOAD_PENDING,
    UPLOAD_STARTED
} from "./constants"
import { genHash, groupArray, strToASCII } from "@justinmusti/utils"
import { KeyMap, MetaData, UploaderOpts, UploadUrlMap } from "./types"
import Auth from "./blueprints/auth"

import Config from "./config"
import { FilelibAPIResponseError } from "./exceptions"
import { getFile } from "./utils"
import request from "./request"

const defaultOptions: Partial<UploaderOpts> = {
    workers: 3,
    onProgress: () => void 0,
    onSuccess: () => void 0,
    onError: () => void 0,
    useCache: true,
    clearCacheOnSuccess: false,
    clearCacheOnError: false
}

export default class Uploader {
    id: UploaderOpts["id"]
    auth: Auth
    file: UploaderOpts["file"]
    config: Config
    metadata: MetaData
    bytesUploaded: number
    storage: UploaderOpts["storage"]
    opts: Partial<UploaderOpts>

    // This is the placeholder for a given file after it gets initialized in Filelib API.
    LOCATION: string

    // This value can be changed if server responds with previous uploads.
    UPLOAD_CHUNK_SIZE: number = MAX_CHUNK_SIZE
    MIN_CHUNK_SIZE = MIN_CHUNK_SIZE
    MAX_CHUNK_SIZE = MAX_CHUNK_SIZE

    // This represents what part numbers to upload.
    UPLOAD_PART_NUMBER_MAP!: UploadUrlMap

    FILE_UPLOAD_STATUS = UPLOAD_PENDING

    constructor({ id, file, config, auth, metadata, storage, ...rest }: UploaderOpts) {
        this.id = id
        this.file = file
        this.auth = auth
        this.config = config
        this.metadata = metadata

        this.bytesUploaded = 0
        this.storage = storage
        this.opts = { ...defaultOptions, ...rest }
    }

    private gen_init_payload() {
        return {
            file_name: this.metadata.name,
            file_size: this.metadata.size,
            mimetype: this.metadata.type
        }
    }

    private async getInitUploadHeaders() {
        const authHeaders = await this.auth.to_headers()
        const configHeaders = this.config.to_headers()
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...authHeaders,
            ...configHeaders
        }
    }

    /**
     * Parse headers from initialization and status check and assign headers to the following:
     * - MAX_CHUNK_SIZE,
     * - MIN_CHUNK_SIZE
     * - UPLOAD_CHUNK_SIZE
     *
     * @param headers
     * @private
     */
    private parseHeaders(headers: Headers): void {
        this.MAX_CHUNK_SIZE = parseInt(headers.get(UPLOAD_MAX_CHUNK_SIZE_HEADER)!) ?? this.MAX_CHUNK_SIZE
        this.MIN_CHUNK_SIZE = parseInt(headers.get(UPLOAD_MIN_CHUNK_SIZE_HEADER)!) ?? this.MIN_CHUNK_SIZE
        this.UPLOAD_CHUNK_SIZE = parseInt(headers.get(UPLOAD_CHUNK_SIZE_HEADER)!) ?? this.UPLOAD_CHUNK_SIZE
    }

    /**
     * Generate and return a unique key for a given file.
     * @private
     */
    private getCacheKey(): string {
        return `filelib/${this.genFileID()}`
    }

    private hasCache() {
        return this.opts.useCache && this.storage.has(this.getCacheKey())
    }

    /**
     * Utilize caching mechanism if useCache set to true.
     *
     * Store upload status to a given storage engine(@justinmusti/storage).
     *
     * @param overrides
     * @private
     */
    private async setCache(overrides?: KeyMap | null | undefined): Promise<void> {
        // Terminate is useCache set to false.
        if (!this.opts?.useCache) {
            return Promise.resolve(void 0)
        }
        const hash = await this.getHash()
        const payload = JSON.stringify({
            hash,
            metaData: this.metadata,
            uploadURL: this.LOCATION,
            creationTime: new Date().toISOString(),
            ...(overrides ?? {})
        })
        this.storage.set(this.getCacheKey(), payload)
    }

    private async initUploadFromCache() {
        const cachedPayload = this.storage.get(this.getCacheKey(), {})
        if (!cachedPayload?.uploadURL) {
            this.storage.unset(this.getCacheKey())
            return this.initUpload()
        }

        await this.retrieveFile(cachedPayload.uploadURL)
    }

    /**
     * Fetch file status from FileLib API
     */
    async retrieveFile(fileURL: string) {
        const {
            headers,
            response: { data }
        } = await request(fileURL, {
            method: "GET",
            headers: await this.auth.to_headers()
        })
        this.prepClassForUpload({ headers, responseData: data })
    }

    /**
     *
     * @private
     */
    private prepClassForUpload({
        headers,
        responseData
    }: {
        headers: Headers
        responseData: {
            location: string
            status: string
            upload_urls: UploadUrlMap
        }
    }) {
        this.LOCATION = responseData.location
        this.FILE_UPLOAD_STATUS = responseData.status.toLowerCase()
        this.UPLOAD_PART_NUMBER_MAP = responseData.upload_urls

        this.MAX_CHUNK_SIZE = parseInt(headers.get(UPLOAD_MAX_CHUNK_SIZE_HEADER)!) ?? this.MAX_CHUNK_SIZE
        this.MIN_CHUNK_SIZE = parseInt(headers.get(UPLOAD_MIN_CHUNK_SIZE_HEADER)!) ?? this.MIN_CHUNK_SIZE
        this.UPLOAD_CHUNK_SIZE = parseInt(headers.get(UPLOAD_CHUNK_SIZE_HEADER)!) ?? this.UPLOAD_CHUNK_SIZE
    }

    /**
     * Initialize file upload process.
     * Acquire a unique URL for the file to be uploaded to.
     */
    async initUpload() {
        // Check if file exists in storage.
        if (this.hasCache()) {
            return this.initUploadFromCache()
        }

        const headers = await this.getInitUploadHeaders()
        const payload = this.gen_init_payload()

        type dataType = {
            is_direct_upload: boolean
            location: string
            upload_urls: { [key: string]: { [key: string]: string | number } }
        }
        const {
            response: { data },
            error,
            headers: resHeaders
        } = await request<dataType>(FILELIB_API_UPLOAD_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        })

        if (error) throw new FilelibAPIResponseError(error)
        this.prepClassForUpload({ headers: resHeaders, responseData: data })

        await this.setCache()
        return data
    }

    async getChunk(partNumber: number) {
        const offset_start = this.UPLOAD_CHUNK_SIZE * (partNumber - 1)
        const offset_end = this.UPLOAD_CHUNK_SIZE * (partNumber - 1) + this.UPLOAD_CHUNK_SIZE
        const source = await this.file
        return await source.slice(offset_start, offset_end)
    }

    async getHash(): Promise<number> {
        const source = await this.file
        const offset_end = Math.min(1000, this.metadata.size ?? 1000)
        const chunk = await source.slice(0, offset_end)
        const payload = await chunk.value.text()
        return genHash(payload)
    }

    async uploadPart(partNumber: number) {
        const { url, log_url, method } = this.UPLOAD_PART_NUMBER_MAP[partNumber]
        const authHeaders = await this.auth.to_headers()
        const chunk = await this.getChunk(partNumber)

        const { raw_response: response, error } = await request(url, {
            method,
            credentials: "same-origin",
            headers: { "Content-Type": "application/octet-stream" },
            body: chunk.value
        })
        if (error) {
            this.opts.onError(this.metadata, error)
            throw new Error(error)
        }
        if (response.ok) {
            await request(log_url, { method: "POST", headers: { ...authHeaders } })
        }
        this.FILE_UPLOAD_STATUS = UPLOAD_STARTED
        const chunkSize = chunk.value.size
        this.bytesUploaded += chunkSize
        this.opts.onProgress(this.bytesUploaded, this.metadata.size)
        return Promise.resolve(true)
    }

    /**
     * Read the given file chunk by chunk provided from the FILELIB API
     * Upload each chunk in its own request.
     * Group uploading chunks by provided worker count
     * Call the callback functions if provided any
     * Update progress by bytes sent and received successfully
     */
    async process_chunks() {
        const part_numbers = Object.keys(this.UPLOAD_PART_NUMBER_MAP).map((v) => parseInt(v))
        const lastPartNumber = Math.max(...part_numbers)
        part_numbers.indexOf(lastPartNumber)
        const index = part_numbers.indexOf(lastPartNumber)
        if (index !== -1) {
            part_numbers.splice(index, 1)
        }
        const groupedParts = groupArray<number>(part_numbers, this.opts.workers)
        for (const partGroup of groupedParts) {
            await Promise.allSettled(
                partGroup.map((p) => {
                    return this.uploadPart(p)
                })
            )
        }

        await this.uploadPart(lastPartNumber)
        const file = await getFile({ auth: this.auth, fileURL: this.LOCATION })
        this.opts.onSuccess(file)
        this.FILE_UPLOAD_STATUS = UPLOAD_COMPLETED
        return true
    }

    async upload() {
        try {
            await this.initUpload()
            if (this.FILE_UPLOAD_STATUS === UPLOAD_COMPLETED) {
                this.opts.onProgress(this.metadata.size, this.metadata.size)
                const file = await getFile({ auth: this.auth, fileURL: this.LOCATION })
                this.opts.onSuccess(file)
                return Promise.resolve(`UPLOADED FROM CACHE ${this.metadata.name}`)
            }
            await this.process_chunks()
            return Promise.resolve(`UPLOADED ${this.metadata.name}`)
        } catch (e: unknown) {
            this.opts.onError(this.metadata, e as Error)
            return Promise.reject(`Failed file ${this.metadata.name} with logged reason`)
        }
    }

    genFileID(): string {
        let output = ""
        if (this.metadata.name) {
            output += strToASCII(this.metadata.name)
        }
        if (this.metadata.size) {
            output += `-${this.metadata.size}`
        }
        if (this.metadata.type) {
            output += `-${strToASCII(this.metadata.type)}`
        }
        return output.replace(/\//g, "-")
    }
}
