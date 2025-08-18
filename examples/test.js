"use server"
import Client, { Auth, Config } from "@filelib/client/node"

/**
 * The following must work as part of the Client integration.
 * */

const authKey = "9e25d144-8715-4dc2-9c96-e55b3dfacb5e"
const authSecret = "e5543662-9378-4146-9caf-f7df69212a37"

// 1. Authentication must work.
// TODO: source must be optional if authKey, and authSecret are provided.
const auth = new Auth({ authKey, authSecret })

// Config initialization must work.
const config = new Config({ storage: "s3main" })

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
    auth,
    config,
    onError: (m, e) => console.log("ERROR", m, e)
})

const filePath = "./example.txt"

/**
 * Add file must use the new FileReader
 *
 * I have crated a new FileReader class, one for each environment, node, and browser.
 * Integrate the use of the new file reader instead of the one being used from tus-js-client.
 * */
client.addFile({ file: filePath })

// This must complete successfully with all the changes made.
client.upload()

// Additional TODOs:
// 1. Make sure all the code written that is not in dist folder to pass the Prettier check.
//      There is already a prettierrc file, do not modify it, use the existing rules as is.
// 2. Make sure linting passes with the existing rules.
// 3. Make sure there are no errors raised when you run `npm run pack`
