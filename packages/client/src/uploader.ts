import { genHash, groupArray } from "@justinmusti/utils"
import { KeyMap, MetaData, UploaderOpts, UploadUrlMap } from "./types"
import {
    MAX_CHUNK_SIZE,
    MIN_CHUNK_SIZE,
    UPLOAD_CHUNK_SIZE_HEADER,
    UPLOAD_COMPLETED,
    UPLOAD_MAX_CHUNK_SIZE_HEADER,
    UPLOAD_MIN_CHUNK_SIZE_HEADER,
    UPLOAD_PENDING,
    UPLOAD_STARTED
} from "./constants"

import Auth from "./blueprints/auth"
import Config from "./config"
import { FilelibAPIResponseError } from "./exceptions"
import { getFile } from "./utils"
import request from "./request"
import { Storage } from "@justinmusti/storage"

export default class Uploader {
    auth: Auth
    file: UploaderOpts["file"]
    config: Config
    metadata: MetaData
    workers: number
    onProgress?: UploaderOpts["onProgress"]
    onSuccess?: UploaderOpts["onSuccess"]
    bytesUploaded: number
    storage: Storage

    // This is the placeholder for a given file after it gets initialized in Filelib API.
    LOCATION!: string

    // This value can be changed if server responds with previous uploads.
    UPLOAD_CHUNK_SIZE: number = MAX_CHUNK_SIZE
    MIN_CHUNK_SIZE = MIN_CHUNK_SIZE
    MAX_CHUNK_SIZE = MAX_CHUNK_SIZE

    // This represents what part numbers to upload.
    UPLOAD_PART_NUMBER_MAP!: UploadUrlMap

    FILE_UPLOAD_STATUS = UPLOAD_PENDING

    // Key name for storing unique file URL
    // TODO: Implement this later
    _CACHE_ENTITY_KEY = "LOCATION"

    constructor({ file, config, auth, metadata, workers = 3, onProgress, onSuccess, storage }: UploaderOpts) {
        this.file = file
        this.auth = auth
        this.config = config
        this.metadata = metadata
        this.workers = workers
        this.onProgress = onProgress
        this.onSuccess = onSuccess
        this.bytesUploaded = 0
        this.storage = storage
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
     * Initialize file upload process.
     * Acquire a unique URL for the file to be uploaded to.
     */
    async initUpload() {
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
        } = await request<dataType>("http://api.filelib.net:8000/upload/", {
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

    private async setCache(overrides?: KeyMap | null | undefined): Promise<void> {
        const hash = await this.getHash()
        const payload = JSON.stringify({
            hash,
            metaData: this.metadata,
            uploadURL: this.LOCATION,
            creationTime: new Date().toISOString(),
            ...(overrides ?? {})
        })
        const cacheName = `filelib/${this.metadata.name}`
        console.log(hash)
        this.storage.set(cacheName, payload)
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
        console.log("CREATING HAS FROM PAYLOAD", payload)
        const hash = genHash(payload)
        console.log("CREATED HASH", hash)
        return hash
    }

    async uploadPart(partNumber: number) {
        const { url, log_url, method } = this.UPLOAD_PART_NUMBER_MAP[partNumber]
        console.log("UPLOADING CHUNK", partNumber, url, log_url, method)
        const authHeaders = await this.auth.to_headers()
        const chunk = await this.getChunk(partNumber)
        console.log("CHUNK", chunk)
        console.log("CHUNK DATA", await chunk.value.text())
        // console.log("GRPOUP ARRAY", groupArray(Array.from(Array(1).keys()), 3))

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
        this?.onProgress(this.bytesUploaded, this.metadata.size)
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
        const groupedParts = groupArray<number>(part_numbers, this.workers)
        console.log("GROUPED ARRAY", groupedParts)
        for (const partGroup of groupedParts) {
            const settlements = await Promise.allSettled(
                partGroup.map(async (p) => {
                    await this.uploadPart(p)
                })
            )
            // Promise.allSettled(partGroup.map(async (p) => await this.uploadPart(p))).then(console.log)
            console.log("PROMISE POOL SETTLEMENT", settlements)
        }
        console.log("UPLOADING LAST PART", lastPartNumber)
        await this.uploadPart(lastPartNumber)
        const file = await getFile({ auth: this.auth, fileURL: this.LOCATION })
        this?.onSuccess(file)
        // getFile(this.)
        this.FILE_UPLOAD_STATUS = UPLOAD_COMPLETED
        return true
    }

    async upload() {
        await this.initUpload()
        await this.getHash()
        const location = this.LOCATION
        console.log("UPLOAD CHUNK LOCATION", location)
        console.log("PART NUMBER MAP", this.UPLOAD_PART_NUMBER_MAP)
        await this.process_chunks()
    }
}
