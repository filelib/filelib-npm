import * as path from "node:path"
import { fileTypeFromBlob, fileTypeFromBuffer, fileTypeFromFile } from "file-type"
import { open, stat } from "fs/promises"
import { FileDoesNotExistError } from "../exceptions"
import FileReaderBase from "../blueprints/file_reader"
import { MetaData } from "../types"
import { statSync } from "fs"

/**
 * Node.js file reader implementation
 */
export class FileReader extends FileReaderBase<string | Buffer | Blob> {
    constructor({
        file,
        name,
        size,
        type
    }: {
        file: string | Buffer | Blob
        name?: MetaData["name"]
        size?: MetaData["size"]
        type?: MetaData["type"]
    }) {
        if (typeof file === "string") {
            try {
                const stats = statSync(file)
                if (!stats.isFile()) {
                    throw new FileDoesNotExistError(`Path is not a file: ${file}`)
                }
            } catch {
                throw new FileDoesNotExistError(`File does not exist or inaccessible: ${file}`)
            }
        }
        super({ file, name, size, type })
    }

    async getSize(): Promise<number> {
        if (typeof this.file === "string") {
            const stats = await stat(this.file)
            return stats.size
        } else if (Buffer.isBuffer(this.file)) {
            return this.file.length
        } else if (this.file instanceof Blob) {
            return this.file.size
        }
        throw new Error("Unsupported file type")
    }

    async getName() {
        // Given name takes priority.
        if (this.name && this.name.length > 0) return this.name
        if (typeof this.file === "string") return path.basename(this.file)
        if (this.file instanceof File) return this.name
        throw new Error("Unable to extract file name")
    }

    async getType() {
        if (this.type && this.type.length > 0) return this.type

        if (typeof this.file === "string") {
            const fileType = await fileTypeFromFile(this.file)
            return fileType.mime
        }
        if (Buffer.isBuffer(this.file)) {
            const fileType = await fileTypeFromBuffer(this.file)
            return fileType.mime
        }
        if (this.file instanceof Blob) {
            const fileType = await fileTypeFromBlob(this.file)
            return fileType.mime
        }
        throw new Error("Unable to retrieve file mimetype")
    }

    async slice(start: number, end: number): Promise<Uint8Array> {
        if (typeof this.file === "string") {
            const fd = await open(this.file, "r")
            try {
                const size = end - start
                const buffer = Buffer.alloc(size)
                await fd.read(buffer, 0, size, start)
                return new Uint8Array(buffer)
            } finally {
                await fd.close()
            }
        } else if (Buffer.isBuffer(this.file)) {
            return new Uint8Array(this.file.subarray(start, end))
        } else if (this.file instanceof Blob) {
            const blobSlice = this.file.slice(start, end)
            const arrayBuffer = await blobSlice.arrayBuffer()
            return new Uint8Array(arrayBuffer)
        } else {
            throw new Error(
                `Failed to read file from the offset:${start} to offset:${end} of file:${await this.getName()}`
            )
        }
    }

    async read({
        start = 0,
        end = Infinity
    }: {
        start?: number
        end?: number
    } = {}): Promise<Uint8Array> {
        if (typeof this.file === "string") {
            const fd = await open(this.file, "r")
            try {
                const size = end != null ? end - start : (await this.getSize()) - start
                const buffer = Buffer.alloc(size)
                await fd.read(buffer, 0, size, start)
                return new Uint8Array(buffer)
            } finally {
                await fd.close()
            }
        } else if (Buffer.isBuffer(this.file)) {
            const sliced = this.file.subarray(start, end)
            return new Uint8Array(sliced)
        } else if (this.file instanceof Blob) {
            const sliced = this.file.slice(start, end)
            const arrayBuffer = await sliced.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            return new Uint8Array(buffer)
        }
        throw new Error(` Unable to read file: ${await this.getName()}`)
    }
}
