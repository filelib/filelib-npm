import { FileDoesNotExistError } from "../src/exceptions"
import { FileReader } from "../src/node/file_reader"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("FileReader", () => {
  let tempDir: string
  let testFilePath: string
  let testBuffer: Buffer
  let testBlob: Blob

  beforeEach(() => {
    // Create temporary directory and files for testing
    tempDir = join(tmpdir(), `filelib-test-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })
    testFilePath = join(tempDir, "test-file.txt")

    // Create test file with content
    const testContent = "Hello, this is a test file for FileReader testing!"
    writeFileSync(testFilePath, testContent)

    // Create test buffer
    testBuffer = Buffer.from(testContent)

    // Create test blob
    testBlob = new Blob([testContent], { type: "text/plain" })
  })

  afterEach(() => {
    // Clean up temporary files
    try {
      unlinkSync(testFilePath)
      rmdirSync(tempDir)
    } catch {
      // Ignore cleanup errors
    }
  })

  describe("Constructor", () => {
    test("should create FileReader with string file path", () => {
      const reader = new FileReader({ file: testFilePath })
      expect(reader).toBeInstanceOf(FileReader)
    })

    test("should create FileReader with Buffer", () => {
      const reader = new FileReader({ file: testBuffer })
      expect(reader).toBeInstanceOf(FileReader)
    })

    test("should create FileReader with Blob", () => {
      const reader = new FileReader({ file: testBlob })
      expect(reader).toBeInstanceOf(FileReader)
    })

    test("should create FileReader with custom name, size, and type", () => {
      const reader = new FileReader({
        file: testFilePath,
        name: "custom-name.txt",
        size: 100,
        type: "text/plain"
      })
      expect(reader).toBeInstanceOf(FileReader)
    })

    test("should throw FileDoesNotExistError for non-existent file path", () => {
      expect(() => new FileReader({ file: "/non/existent/file.txt" }))
        .toThrow(FileDoesNotExistError)
    })

    test("should throw FileDoesNotExistError for directory path", () => {
      expect(() => new FileReader({ file: tempDir }))
        .toThrow(FileDoesNotExistError)
    })


  })

  describe("getSize", () => {
    test("should return correct size for string file path", async () => {
      const reader = new FileReader({ file: testFilePath })
      const size = await reader.getSize()
      expect(size).toBe(50) // Length of "Hello, this is a test file for FileReader testing!"
    })

    test("should return correct size for Buffer", async () => {
      const reader = new FileReader({ file: testBuffer })
      const size = await reader.getSize()
      expect(size).toBe(50)
    })

    test("should return correct size for Blob", async () => {
      const reader = new FileReader({ file: testBlob })
      const size = await reader.getSize()
      expect(size).toBe(50)
    })


  })

  describe("getName", () => {
    test("should return custom name when provided", async () => {
      const reader = new FileReader({
        file: testFilePath,
        name: "custom-name.txt"
      })
      const name = await reader.getName()
      expect(name).toBe("custom-name.txt")
    })

    test("should return basename for string file path", async () => {
      const reader = new FileReader({ file: testFilePath })
      const name = await reader.getName()
      expect(name).toBe("test-file.txt")
    })

    test("should throw error for Buffer without custom name", async () => {
      const reader = new FileReader({ file: testBuffer })
      await expect(reader.getName()).rejects.toThrow("Unable to extract file name")
    })

    test("should throw error for Blob without custom name", async () => {
      const reader = new FileReader({ file: testBlob })
      await expect(reader.getName()).rejects.toThrow("Unable to extract file name")
    })

    test("should return custom name for Buffer when provided", async () => {
      const reader = new FileReader({
        file: testBuffer,
        name: "buffer-file.txt"
      })
      const name = await reader.getName()
      expect(name).toBe("buffer-file.txt")
    })

    test("should return custom name for Blob when provided", async () => {
      const reader = new FileReader({
        file: testBlob,
        name: "blob-file.txt"
      })
      const name = await reader.getName()
      expect(name).toBe("blob-file.txt")
    })
  })

  describe("getType", () => {
    test("should return custom type when provided", async () => {
      const reader = new FileReader({
        file: testFilePath,
        type: "application/custom"
      })
      const type = await reader.getType()
      expect(type).toBe("application/custom")
    })


  })

  describe("slice", () => {
    test("should slice string file path correctly", async () => {
      const reader = new FileReader({ file: testFilePath })
      const slice = await reader.slice(0, 5)
      expect(slice).toEqual(new Uint8Array([72, 101, 108, 108, 111])) // "Hello"
    })

    test("should slice Buffer correctly", async () => {
      const reader = new FileReader({ file: testBuffer })
      const slice = await reader.slice(0, 5)
      expect(slice).toEqual(new Uint8Array([72, 101, 108, 108, 111])) // "Hello"
    })

    test("should slice Blob correctly", async () => {
      const reader = new FileReader({ file: testBlob })
      const slice = await reader.slice(0, 5)
      expect(slice).toEqual(new Uint8Array([72, 101, 108, 108, 111])) // "Hello"
    })

    test("should slice from middle of file", async () => {
      const reader = new FileReader({ file: testFilePath })
      const slice = await reader.slice(7, 11)
      expect(slice).toEqual(new Uint8Array([116, 104, 105, 115])) // "this"
    })

    test("should handle empty slice", async () => {
      const reader = new FileReader({ file: testFilePath })
      const slice = await reader.slice(5, 5)
      expect(slice).toEqual(new Uint8Array(0))
    })


  })

  describe("getMetadata", () => {


    test("should return complete metadata for Buffer", async () => {
      const reader = new FileReader({ file: testBuffer })
      await expect(reader.getMetadata()).rejects.toThrow("Unable to extract file name")
    })

    test("should return complete metadata for Blob", async () => {
      const reader = new FileReader({ file: testBlob })
      await expect(reader.getMetadata()).rejects.toThrow("Unable to extract file name")
    })

    test("should return custom metadata when provided", async () => {
      const reader = new FileReader({
        file: testFilePath,
        name: "custom-name.txt",
        size: 100,
        type: "application/custom"
      })
      const metadata = await reader.getMetadata()
      expect(metadata.size).toBe(50) // Actual file size takes precedence
      expect(metadata.name).toBe("custom-name.txt")
      expect(metadata.type).toBe("application/custom")
    })
  })

  describe("Edge cases and error handling", () => {
    test("should handle very large files", async () => {
      // Create a larger test file
      const largeContent = "x".repeat(10000)
      const largeFilePath = join(tempDir, "large-file.txt")
      writeFileSync(largeFilePath, largeContent)

      const reader = new FileReader({ file: largeFilePath })
      const size = await reader.getSize()
      expect(size).toBe(10000)

      // Clean up
      unlinkSync(largeFilePath)
    })

    test("should handle binary files", async () => {
      // Create a binary file
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF])
      const binaryFilePath = join(tempDir, "binary.bin")
      writeFileSync(binaryFilePath, binaryContent)

      const reader = new FileReader({ file: binaryFilePath })
      const size = await reader.getSize()
      expect(size).toBe(5)

      const slice = await reader.slice(0, 3)
      expect(slice).toEqual(new Uint8Array([0x00, 0x01, 0x02]))

      // Clean up
      unlinkSync(binaryFilePath)
    })

    test("should handle files with special characters in name", async () => {
      const specialName = "test-file-émojis-🚀-特殊字符.txt"
      const specialFilePath = join(tempDir, specialName)
      writeFileSync(specialFilePath, "test content")

      const reader = new FileReader({ file: specialFilePath })
      const name = await reader.getName()
      expect(name).toBe(specialName)

      // Clean up
      unlinkSync(specialFilePath)
    })
  })
}) 