import Client, { defaultOpts } from "../src/browser/client"
import { describe, expect, test } from "bun:test"
import { AuthMissingCredentialError } from "../src"

describe("Browser Client Init", () => {
    test("Init Browser Client with no parameters must fail", () => {
        // @ts-expect-error at least one param required.
        expect(() => new Client()).toThrow(TypeError)
    })

    test("Init Browser Client with params missing `authKey` must fail", () => {
        expect(() => new Client({})).toThrow(AuthMissingCredentialError)
    })

    test("Ensure client has an empty files property on initiation", () => {
        const client = new Client({ authKey: "test-auth-key" })
        console.log("FILES", client.files)
        expect(client.files).toEqual([])
    })
    test("Ensure client has default options assigned on initiation", () => {
        const client = new Client({ authKey: "test-auth-key" })
        console.log("FILES", client.opts)
        expect(client.opts).toEqual(defaultOpts)
    })
})
