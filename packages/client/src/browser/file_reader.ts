import { fileTypeFromBlob, fileTypeFromBuffer } from "file-type"
import FileReaderBase from "../blueprints/file_reader"
import { MetaData } from "../types"

export default class FileReader extends FileReaderBase<File | Blob> {
    constructor({
        file,
        name,
        size,
        type
    }: {
        file: File | Blob
        name?: MetaData["name"]
        size?: MetaData["size"]
        type?: MetaData["type"]
    }) {
        if (!(file instanceof File || file instanceof Blob)) {
            throw new Error("BrowserFileReader only supports File or Blob.")
        }
        super({ file, name, size, type })
    }

    async getSize(): Promise<number> {
        return this.file.size
    }

    async getName() {
        // Given name takes priority.
        if (this.name && this.name.length > 0) return this.name
        if (this.file instanceof File) return this.file.name
        if ("name" in this.file) return this.file.name as string
        throw new Error("Unable to extract file name")
    }

    async getType() {
        if (this.type && this.type.length > 0) return this.type
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
        const blobSlice = this.file.slice(start, end)
        const arrayBuffer = await blobSlice.arrayBuffer()
        return new Uint8Array(arrayBuffer)
    }

    async read({
        start = 0,
        end
    }: {
        start?: number
        end?: number
    } = {}): Promise<Uint8Array> {
        const blob = this.file.slice(start, end)
        const arrayBuffer = await blob.arrayBuffer()
        return new Uint8Array(arrayBuffer)
    }
}
