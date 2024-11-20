import {
    FILE_UPLOAD_STATUS_HEADER,
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

        console.log("Uploader INITED WITH ID", id)
        console.log("Uploader INITED WITH AUTH", auth)
        console.log("Uploader INITED WITH file", file)
        console.log("Uploader INITED WITH config", config)
        console.log("Uploader INITED WITH metadata", metadata)
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
        console.log("CHECKING CACHE", this.getCacheKey())
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
        console.log("SETTING CACHE", this.getCacheKey(), payload)
        this.storage.set(this.getCacheKey(), payload)
    }

    private async initUploadFromCache() {
        console.log("INITING FROM CACHE")
        const cachedpaylaod = this.storage.get(this.getCacheKey(), {})
        if (!cachedpaylaod?.uploadURL) {
            this.storage.unset(this.getCacheKey())
            return this.initUpload()
        }
        console.log("CACHE PAYLOAD", cachedpaylaod)
        console.log("CAHCED UPLOAD URL", cachedpaylaod.uploadURL)
        await this.headFile(cachedpaylaod?.uploadURL)
    }

    /**
     * Fetch file status from FileLib API
     */
    async headFile(fileURL: string) {
        const { headers, response } = await request(fileURL, {
            method: "HEAD",
            headers: await this.auth.to_headers()
        })
        console.log("HEAD FILE RESPONSE headers", headers)
        headers.forEach((value, key) => console.log("HEADER", key, value))
        // Check if completed.

        console.log("HEADERS HAS STATUS", headers.has(FILE_UPLOAD_STATUS_HEADER))
        console.log("HEADERS STATUS VALUE", headers.get(FILE_UPLOAD_STATUS_HEADER))
        if (headers.has(FILE_UPLOAD_STATUS_HEADER)) {
            if (headers.get(FILE_UPLOAD_STATUS_HEADER).toLowerCase() === UPLOAD_COMPLETED) {
                // Call the onProgress and mark it completed.
                this.opts.onProgress(this.metadata.size, this.metadata.size)
                const file = await getFile({ auth: this.auth, fileURL })
                this.opts.onSuccess(file)
                console.log("THIS UPLOAD COMPLETED")
            }
        }
        this.parseHeaders(headers)
        console.log("HEAD FILE RESPONSE response", response)
    }

    /**
     *
     * @private
     */
    private prepClassForUpload({ uploadURL, uploadStatus, uploadPartNumberMap }) {
        this.LOCATION = uploadURL
        this.FILE_UPLOAD_STATUS = uploadStatus
        this.UPLOAD_PART_NUMBER_MAP = uploadPartNumberMap
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
        this.parseHeaders(resHeaders)

        // Set the UPLOAD URL MAP FOR EACH CHUNK
        this.UPLOAD_PART_NUMBER_MAP = data.upload_urls
        this.LOCATION = data.location
        await this.setCache()
        return data
    }

    async getChunk(partNumber: number) {
        const offset_start = this.UPLOAD_CHUNK_SIZE * (partNumber - 1)
        const offset_end = this.UPLOAD_CHUNK_SIZE * (partNumber - 1) + this.UPLOAD_CHUNK_SIZE
        console.log("SLICE START, END ", offset_start, offset_end)
        console.log("FILE OBJECT", this.file)
        console.log("FILE TYPE", this.file.constructor.name)
        const source = await this.file
        console.log("SOURCE TYPE", source.constructor.name)
        return await source.slice(offset_start, offset_end)
    }

    async getHash(): Promise<number> {
        const source = await this.file
        console.log("FILE SIZE", this.metadata.size)
        const offset_end = Math.min(1000, this.metadata.size ?? 1000)
        const chunk = await source.slice(0, offset_end)

        const payload = await chunk.value.text()
        // console.log("CREATING HAS FROM PAYLOAD", payload)
        const hash = genHash(payload)
        console.log("CREATED HASH", hash)
        return hash
    }

    async uploadPart(partNumber: number) {
        const { url, log_url, method } = this.UPLOAD_PART_NUMBER_MAP[partNumber]
        console.log("UPLOADING CHUNK", partNumber, url, log_url, method)
        const authHeaders = await this.auth.to_headers()
        const chunk = await this.getChunk(partNumber)

        const { raw_response: response, error } = await request(url, {
            method,
            credentials: "same-origin",
            headers: { "Content-Type": "application/octet-stream" },
            body: chunk.value
        })
        if (error) {
            throw new Error(error)
        }
        if (response.ok) {
            console.log("LOGGING SUCCESS PART", partNumber)
            await request(log_url, { method: "POST", headers: { ...authHeaders } })
        }
        this.FILE_UPLOAD_STATUS = UPLOAD_STARTED
        console.log("COMPLETED CHUNK", partNumber, this.LOCATION)
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
        const authHeaders = await this.auth.to_headers()
        console.log("AUTH HEADERS", authHeaders)
        const lastPartNumber = Math.max(...part_numbers)
        part_numbers.indexOf(lastPartNumber)
        const index = part_numbers.indexOf(lastPartNumber)
        if (index !== -1) {
            part_numbers.splice(index, 1)
        }
        console.log("PART NUMBERS", part_numbers)
        const groupedParts = groupArray<number>(part_numbers, this.opts.workers)
        console.log("GROUPED ARRAY", groupedParts)
        for (const partGroup of groupedParts) {
            const settlements = await Promise.allSettled(
                partGroup.map((p) => {
                    return this.uploadPart(p)
                })
            )
            // Promise.allSettled(partGroup.map(async (p) => await this.uploadPart(p))).then(console.log)
            console.log("PROMISE POOL SETTLEMENT", settlements)
        }
        console.log("UPLOADING LAST PART", lastPartNumber)
        await this.uploadPart(lastPartNumber)
        const file = await getFile({ auth: this.auth, fileURL: this.LOCATION })
        this.opts.onSuccess(file)
        this.FILE_UPLOAD_STATUS = UPLOAD_COMPLETED
        return true
    }

    async upload() {
        // return Promise.resolve(`UPLOADED ${this.metadata.name}`)
        try {
            await this.initUpload()
            const location = this.LOCATION
            console.log("UPLOAD CHUNK LOCATION", location)
            console.log("PART NUMBER MAP", this.UPLOAD_PART_NUMBER_MAP)
            await this.process_chunks()
            console.warn(`Processed file ${this.metadata.name}`)
            return Promise.resolve(`UPLOADED ${this.metadata.name}`)
        } catch (e: unknown) {
            console.error("UPLOADER UPLOAD ERROR:", e)
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
