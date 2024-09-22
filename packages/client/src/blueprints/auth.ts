import { AuthOptions } from "../types"
import { AUTHORIZATION_HEADER } from "../constants"

export default abstract class Auth {
    protected auth_key!: AuthOptions["auth_key"]
    protected access_token!: string
    protected expiration!: Date

    constructor() {
        console.log("ABSTRACT AUTH INITED.")
    }

    abstract acquire_access_token(): Promise<string>

    // abstract is_access_token(): boolean
    //
    // abstract is_expired(): boolean
    //
    // abstract get_access_token(): Promise<string>
    //
    // abstract to_headers(): Promise<Record<string, string>>

    is_access_token(): boolean {
        return !!this.access_token
    }

    is_expired(): boolean {
        return this.is_access_token() && this.expiration && this.expiration < new Date()
    }

    async get_access_token(): Promise<string> {
        if (!this.access_token || this.is_expired()) {
            await this.acquire_access_token()
        }
        return this.access_token
    }

    async to_headers() {
        return {
            [AUTHORIZATION_HEADER]: `Bearer ${await this.get_access_token()}`
        }
    }
}
