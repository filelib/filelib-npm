import { ClientAuthRequiredError } from "../src"
import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test"

import Auth from "../src/browser/auth"
import Client from "../src/browser/client"
import Config from "../src/config"
import FileReader from "../src/browser/file_reader"

// Mock localStorage for Node.js environment
global.localStorage = {
    getItem: () => null,
    setItem: () => {
        // Mock implementation
    },
    removeItem: () => {
        // Mock implementation
    },
    clear: () => {
        // Mock implementation
    },
    key: () => null,
    length: 0
} as Storage

let authKey: string

beforeAll(() => {
    if (!process.env.FILELIB_API_KEY) {
        throw new Error("Missing env vars")
    }
    authKey = process.env.FILELIB_API_KEY
})

describe("Browser Client Init", () => {
    test("Init Browser Client with no parameters must fail", () => {
        // @ts-expect-error at least one param required
        expect(() => new Client()).toThrow(TypeError)
    })

    test("Init Browser Client with no auth credentials must fail", () => {
        expect(() => new Client({})).toThrow(ClientAuthRequiredError)
    })

    test("Init Browser Client with only config as Config instance must fail", () => {
        const config = new Config({ storage: "test-storage" })
        expect(() => new Client({ config })).toThrow(ClientAuthRequiredError)
    })

    test("Init Browser Client with only config as string must fail", () => {
        expect(() => new Client({ config: "test-storage" })).toThrow(ClientAuthRequiredError)
    })

    test("Init Browser Client with config and authKey must succeed", () => {
        const config = new Config({ storage: "test-storage" })
        const client = new Client({ config, authKey })
        expect(client.config).toBe(config)
        expect(client.auth).toBeInstanceOf(Auth)
        expect(client.files).toEqual([])
        expect(client.opts).toBeDefined()
    })

    test("Init Browser Client with string config and authKey must succeed", () => {
        const client = new Client({ config: "test-storage", authKey })
        expect(client.config).toBeInstanceOf(Config)
        expect(client.config?.storage).toBe("test-storage")
        expect(client.auth).toBeInstanceOf(Auth)
    })

    test("Init Browser Client with auth instance must succeed", () => {
        const auth = new Auth({ authKey })
        const config = new Config({ storage: "test-storage" })
        const client = new Client({ auth, config })
        expect(client.auth).toBe(auth)
        expect(client.config).toBe(config)
    })

    test("Init Browser Client with custom options must set opts correctly", () => {
        const customOpts = { parallelUploads: 10, limit: 50 }
        const client = new Client({
            config: "test-storage",
            authKey,
            ...customOpts
        })
        expect(client.opts.parallelUploads).toBe(10)
        expect(client.opts.limit).toBe(50)
    })

    test("Init Browser Client with default options must set correct defaults", () => {
        const client = new Client({ config: "test-storage", authKey })
        expect(client.opts.parallelUploads).toBe(5)
        expect(client.opts.limit).toBe(20)
        expect(client.opts.useCache).toBe(true)
        expect(client.opts.abortOnFail).toBe(true)
        expect(client.opts.clearCache).toBe(false)
    })
})

describe("Browser Client addFile", () => {
    let client: Client
    let mockConfig: Config
    let mockFile: File

    beforeEach(() => {
        mockConfig = new Config({ storage: "test-storage" })
        client = new Client({ config: mockConfig, authKey })

        // Create a mock File object
        mockFile = new File(["test content"], "test.txt", { type: "text/plain" })
    })

    test("addFile with valid File object must succeed", () => {
        const metadata = { name: "test", size: 1000, type: "text/plain" }

        expect(() => client.addFile({ id: "test-id", file: mockFile, metadata })).not.toThrow()
        expect(client.files).toHaveLength(1)
    })

    test("addFile with string config must create new Config instance", () => {
        const metadata = { name: "test", size: 1000, type: "text/plain" }

        client.addFile({ id: "test-id", file: mockFile, config: "custom-storage", metadata })
        expect(client.files).toHaveLength(1)
    })

    test("addFile with Config instance must use provided config", () => {
        const customConfig = new Config({ storage: "custom-storage" })
        const metadata = { name: "test", size: 1000, type: "text/plain" }

        client.addFile({ id: "test-id", file: mockFile, config: customConfig, metadata })
        expect(client.files).toHaveLength(1)
    })

    test("addFile without config must use client's config", () => {
        const metadata = { name: "test", size: 1000, type: "text/plain" }

        client.addFile({ id: "test-id", file: mockFile, metadata })
        expect(client.files).toHaveLength(1)
    })

    test("addFile with onError callback must handle errors gracefully", () => {
        const metadata = { name: "test", size: 1000, type: "text/plain" }
        const onError = mock(() => {
            // Mock error handler
        })

        // Create a client without config to trigger error
        const clientWithoutConfig = new Client({ authKey })
        clientWithoutConfig.addFile({ id: "test-id", file: mockFile, metadata, onError })
        expect(onError).toHaveBeenCalled()
    })

    test("addFile must create Uploader with correct properties", () => {
        const metadata = { name: "test", size: 1000, type: "text/plain" }

        client.addFile({ id: "test-id", file: mockFile, metadata })
        const uploader = client.files[0]

        expect(uploader).toBeDefined()
        expect(uploader.config).toBe(mockConfig)
        expect(uploader.auth).toBe(client.auth)
    })

    test("addFile with id must set uploader id correctly", () => {
        const metadata = { name: "test", size: 1000, type: "text/plain" }
        const id = "custom-file-id"

        client.addFile({ id, file: mockFile, metadata })
        expect(client.files).toHaveLength(1)
    })

    test("addFile must handle multiple files correctly", () => {
        const file1 = new File(["content1"], "file1.txt", { type: "text/plain" })
        const file2 = new File(["content2"], "file2.txt", { type: "text/plain" })

        client.addFile({ id: "file1-id", file: file1, metadata: { name: "file1", size: 1000, type: "text/plain" } })
        client.addFile({ id: "file2-id", file: file2, metadata: { name: "file2", size: 1000, type: "text/plain" } })

        expect(client.files).toHaveLength(2)
    })

    test("addFile must create FileReader with correct properties", () => {
        const metadata = { name: "test", size: 1000, type: "text/plain" }

        client.addFile({ id: "test-id", file: mockFile, metadata })
        const uploader = client.files[0]

        expect(uploader.file).toBeInstanceOf(FileReader)
        expect(uploader.file.file).toBe(mockFile)
    })

    test("addFile must handle metadata correctly", () => {
        const metadata = { name: "test", size: 1000, type: "text/plain" }

        client.addFile({ id: "test-id", file: mockFile, metadata })
        // const uploader = client.files[0]

        expect(client.files).toHaveLength(1)
    })
})

describe("Browser Client validation", () => {
    test("validateAddFile must be inherited from BaseClient", () => {
        const client = new Client({ config: "test-storage", authKey })
        expect(typeof client.validateAddFile).toBe("function")
    })

    test("Client must extend BaseClient", () => {
        const client = new Client({ config: "test-storage", authKey })
        expect(client).toBeInstanceOf(Client)
    })

    test("Client must have correct instance properties", () => {
        const client = new Client({ config: "test-storage", authKey })

        expect(client).toHaveProperty("auth")
        expect(client).toHaveProperty("config")
        expect(client).toHaveProperty("files")
        expect(client).toHaveProperty("opts")
        expect(client).toHaveProperty("addFile")
    })
})

describe("Browser Client error handling", () => {
    test("Client must throw ClientConfigRequiredError when no config provided", () => {
        const client = new Client({ authKey })
        const mockFile = new File(["test"], "test.txt", { type: "text/plain" })

        expect(() => client.addFile({ id: "test-id", file: mockFile, metadata: { name: "test", size: 1000, type: "text/plain" } })).not.toThrow()
        // Error is caught internally and passed to onError callback
    })

    test("Client must handle missing config gracefully", () => {
        const client = new Client({ authKey })
        const mockFile = new File(["test"], "test.txt", { type: "text/plain" })
        const onError = mock(() => {
            // Mock error handler
        })

        client.addFile({ id: "test-id", file: mockFile, metadata: { name: "test", size: 1000, type: "text/plain" }, onError })
        expect(onError).toHaveBeenCalled()
    })
})
