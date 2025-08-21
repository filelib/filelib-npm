import { AuthOptions } from "../types"
import { AUTHORIZATION_HEADER } from "../constants"

export default abstract class Auth {
    protected authKey!: AuthOptions["authKey"]
    protected accessToken!: string
    protected expiration!: Date

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {}

    abstract acquireAccessToken(): Promise<string>

    isAccessToken(): boolean {
        return !!this.accessToken
    }

    isExpired(): boolean {
        return this.isAccessToken() && this.expiration && this.expiration < new Date()
    }

    async getAccessToken(): Promise<string> {
        if (!this.accessToken || this.isExpired()) {
            await this.acquireAccessToken()
        }
        return this.accessToken
    }

    async toHeaders() {
        return {
            [AUTHORIZATION_HEADER]: `Bearer ${await this.getAccessToken()}`
        }
    }
}
