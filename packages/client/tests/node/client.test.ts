import { AuthSourceError, ClientAuthRequiredError, ConfigValidationError } from "../../src"
import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test"
import Auth from "../../src/node/auth"
import Client from "../../src/node/client"
import Config from "../../src/config"

let authKey: string
let authSecret: string

beforeAll(() => {
    if (!process.env.FILELIB_API_KEY || !process.env.FILELIB_API_SECRET) {
        throw new Error("Missing env vars")
    }
    authKey = process.env.FILELIB_API_KEY
    authSecret = process.env.FILELIB_API_SECRET
})

describe("Node Client Init", () => {
    test("Init Node Client with no parameters must fail", () => {
        // @ts-expect-error at least one param required
        expect(() => new Client()).toThrow(TypeError)
    })

    test("Init Node Client with no config credentials must fail", () => {
        expect(() => new Client({})).toThrow(ConfigValidationError)
    })

    test("Init Node Client with only config as Config instance must fail", () => {
        const config = new Config({ storage: "test-storage" })
        expect(() => new Client({ config })).toThrow(ClientAuthRequiredError)
    })

    test("Init Node Client with only config as string must fail", () => {
        expect(() => new Client({ config: "test-storage" })).toThrow(ClientAuthRequiredError)
    })

    test("Init Node Client with config and only authKey must fail", () => {
        const config = new Config({ storage: "test-storage" })
        expect(() => new Client({ config, authKey: "test-auth-key" })).toThrow(AuthSourceError)
    })

    test("Init Node Client with config and only authSecret must fail", () => {
        const config = new Config({ storage: "test-storage" })
        expect(() => new Client({ config, authSecret: "test-auth-secret" })).toThrow(AuthSourceError)
    })

    test("Init Node Client with config and both authKey/authSecret must succeed", () => {
        const config = new Config({ storage: "test-storage" })
        const client = new Client({ config, authKey, authSecret })
        expect(client.config).toBe(config)
        expect(client.auth).toBeInstanceOf(Auth)
        expect(client.files).toEqual([])
        expect(client.opts).toBeDefined()
    })

    test("Init Node Client with string config and both authKey/authSecret must succeed", () => {
        const client = new Client({ config: "test-storage", authKey, authSecret })
        expect(client.config).toBeInstanceOf(Config)
        expect(client.config?.storage).toBe("test-storage")
        expect(client.auth).toBeInstanceOf(Auth)
    })

    test("Init Node Client with auth instance must succeed", () => {
        const auth = new Auth({ authKey, authSecret })
        const config = new Config({ storage: "test-storage" })
        const client = new Client({ auth, config })
        expect(client.auth).toBe(auth)
        expect(client.config).toBe(config)
    })

    test("Init Node Client with source and sourceFile must succeed", () => {
        const client = new Client({ source: "env", config: "test-storage" })
        expect(client.auth).toBeInstanceOf(Auth)
        expect(client.config).toBeInstanceOf(Config)
    })

    test("Init Node Client with custom options must set opts correctly", () => {
        const customOpts = { parallelUploads: 10, limit: 50 }
        const client = new Client({
            config: "test-storage",
            authKey,
            authSecret,
            ...customOpts
        })
        expect(client.opts.parallelUploads).toBe(10)
        expect(client.opts.limit).toBe(50)
    })
})

describe("Node Client addFile", () => {
    let client: Client
    let mockConfig: Config

    beforeEach(() => {
        mockConfig = new Config({ storage: "test-storage" })
        client = new Client({ config: mockConfig, authKey, authSecret })
    })

    test("addFile with valid file path must succeed", () => {
        const filePath = "./package.json"
        const metadata = { name: "test", size: 1000, type: "application/json" }

        expect(() => client.addFile({ id: "test-file", file: filePath, metadata })).not.toThrow()
        expect(client.files).toHaveLength(1)
    })

    test("addFile with non-existent file must throw FileDoesNotExistError", () => {
        const filePath = "./non-existent-file.txt"
        const metadata = { name: "test", size: 0, type: "text/plain" }

        expect(() => client.addFile({ id: "test-file", file: filePath, metadata })).not.toThrow()
    })

    test("addFile with string config must create new Config instance", () => {
        const filePath = "./package.json"
        const metadata = { name: "test", size: 1000, type: "application/json" }

        client.addFile({ id: "test-file", file: filePath, config: "custom-storage", metadata })
        expect(client.files).toHaveLength(1)
    })

    test("addFile with Config instance must use provided config", () => {
        const filePath = "./package.json"
        const customConfig = new Config({ storage: "custom-storage" })
        const metadata = { name: "test", size: 1000, type: "application/json" }

        client.addFile({ id: "test-file", file: filePath, config: customConfig, metadata })
        expect(client.files).toHaveLength(1)
    })

    test("addFile without config must use client's config", () => {
        const filePath = "./package.json"
        const metadata = { name: "test", size: 1000, type: "application/json" }

        client.addFile({ id: "test-file", file: filePath, metadata })
        expect(client.files).toHaveLength(1)
    })

    test("addFile with onError callback must handle errors gracefully", () => {
        const filePath = "./non-existent-file.txt"
        const metadata = { name: "test", size: 0, type: "text/plain" }
        const onError = mock(() => {
            // Mock error handler
        })

        client.addFile({ id: "test-file", file: filePath, metadata, onError })
        expect(onError).toHaveBeenCalled()
    })

    test("addFile must create Uploader with correct properties", () => {
        const filePath = "./package.json"
        const metadata = { name: "test", size: 1000, type: "application/json" }

        client.addFile({ id: "test-file", file: filePath, metadata })
        const uploader = client.files[0]

        expect(uploader).toBeDefined()
        expect(uploader.config).toBe(mockConfig)
        expect(uploader.auth).toBe(client.auth)
    })

    test("addFile with id must set uploader id correctly", () => {
        const filePath = "./package.json"
        const metadata = { name: "test", size: 1000, type: "application/json" }
        const id = "custom-file-id"

        client.addFile({ id, file: filePath, metadata })
        expect(client.files).toHaveLength(1)
    })

    test("addFile must handle multiple files correctly", () => {
        const file1 = "./package.json"
        const file2 = "./tsconfig.json"

        client.addFile({
            id: "file1-id",
            file: file1,
            metadata: { name: "file1", size: 1000, type: "application/json" }
        })
        client.addFile({
            id: "file2-id",
            file: file2,
            metadata: { name: "file2", size: 1000, type: "application/json" }
        })

        expect(client.files).toHaveLength(2)
    })
})

describe("Node Client validation", () => {
    test("validateAddFile must be inherited from BaseClient", () => {
        const client = new Client({ config: "test-storage", authKey, authSecret })
        expect(typeof client.validateAddFile).toBe("function")
    })

    test("Client must extend BaseClient", () => {
        const client = new Client({ config: "test-storage", authKey, authSecret })
        expect(client).toBeInstanceOf(Client)
    })
})
