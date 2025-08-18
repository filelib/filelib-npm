"use server"
import Client, { Auth, Config, FileReader } from "./dist/node/index.js"
/**
 * The following must work as part of the Client integration.
 * */
// const filePath = "./package-lock.json"
const filePath = "/home/musti/repos/filelib-python/examples/media/spacewalk.mp4"

const authKey = "93506bce-2435-4d64-a298-d2d329bfebf2"
const authSecret = "6db51b43-ab92-4e55-b35c-30253a903d45"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const reader = new FileReader({ file: filePath })

console.log("READER", reader)
console.log("READER METADATA", await reader.getMetadata())
const data = await reader.slice(0, 10)
console.log("READ", new TextDecoder().decode(data))
// await delay(5000)
// throw new Error("Done")

// 1. Authentication must work.
// TODO: source must be optional if authKey, and authSecret are provided.
const auth = new Auth({ authKey, authSecret })

const at = await auth.acquireAccessToken()
console.log("ACCESS TOKEN", at)

// Config initialization must work.
const config = new Config({ storage: "s3main" })

console.log("CONFIG", config)

// Initializing Client fully.
/**
 * There needs to be more than one way of initializing thr Client
 *
 * @example
 * const client = new Client()  // Must fail with error due to config missing.
 * const client = new Client({config})  // Must fail with authentication credentials missing.
 * const client = new Client({config, authKey})  // Must fail with authentication credential missing.
 * const client = new Client({config, authSecret})  // Must fail with authentication credential missing.
 * const client = new Client({config, authKey, authSecret})  // Must initialize.
 *
 * // This must initialize a new Config instance if config is provided as a string, similar to how auth
 * // It should be converted as this.config = new Config(storage=config)
 * const client = new Client({config: "s3main", authKey, authSecret})  // Must initialize.
 *
 * // Change how the Auth class parameters are collected.
 * // Currently as below:
 * const client = new Client({authOptions})  // with authOptions being {authKey, authSecret}
 * // It needs to be as such
 * const client = new Client({authKey, authSecret, config, ...rest})
 * // Or if an Auth instance provided, simply use that instead.
 * const auth = new Auth({authKey, authSecret})
 * const client = new Client({auth})  // This should work.
 *
 *
 * */
const client = new Client({
    // auth,
    authKey,
    authSecret,
    config: "s3main",

    onSuccess: (f) => console.log("File uploaded", f),
    onError: (m, e) => console.log("ERROR", m, e)
})

// console.log("CLIENT AUTH", await client.auth.acquireAccessToken())

/**
 * Add file must use the new FileReader
 *
 * I have crated a new FileReader class, one for each environment, node, and browser.
 * Integrate the use of the new file reader instead of the one being used from tus-js-client.
 * */
client.addFile({ file: filePath, metadata: await reader.getMetadata() })

console.log("CLIENT INSTANCE", client)

// This must complete successfully with all the changes made.
await client.upload()
console.log("Files:", client.files)
await delay(50000)

// Additional TODOs:
// 1. Make sure all the code written that is not in dist folder to pass the Prettier check.
//      There is already a prettierrc file, do not modify it, use the existing rules as is.
// 2. Make sure linting passes with the existing rules.
// 3. Make sure there are no errors raised when you run `npm run pack`
