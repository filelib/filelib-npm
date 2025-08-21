import { Blob } from "buffer"
import { MetaData } from "../types"

/**
 * Abstract base class for file readers
 */
export default abstract class FileReaderBase<T = string | File | Buffer | Blob> {
    protected file: T
    name!: MetaData["name"]
    size!: MetaData["size"]
    type!: MetaData["type"]

    constructor({
        file,
        name,
        size,
        type
    }: {
        file: T
        name?: MetaData["name"]
        size?: MetaData["size"]
        type?: MetaData["type"]
    }) {
        this.file = file
        this.name = name
        this.size = size
        this.type = type
    }

    /**
     * Get the file size in bytes
     * @return number
     *
     * Throws Error if unable to acquire size.
     */
    abstract getSize(): Promise<number>

    /**
     * Retrieve and return the given file's name as s string
     * @return string
     *
     * Throws an error if unable to acquire file name
     *  */
    abstract getName(): Promise<string>

    /**
     * Retrieve and return the given file's mimetype
     * @return string
     *
     * Throws Error if it fails to retrieve the type.
     * */

    abstract getType(): Promise<string>

    /**
     * Get file metadata from the provided file as much as the information available.
     * @return MetaData
     */
    async getMetadata(): Promise<MetaData> {
        return {
            size: await this.getSize(),
            name: await this.getName(),
            type: await this.getType()
        }
    }

    /**
     * Returns raw bytes from start (inclusive) to end (exclusive) as Uint8Array.
     */
    abstract slice(start: number, end: number): Promise<Uint8Array>

    /**
     * Read a portion of the file.
     * @param params.start Byte offset to start (inclusive)
     * @param params.end Byte offset to end (exclusive)
     * @param params.encoding Encoding for output string; if omitted returns Uint8Array
     */
    abstract read(params?: { start?: number; end?: number }): Promise<Uint8Array>
}
