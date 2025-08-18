import { ApiResponse } from "./types"

/**
 * Use fetch in a strongly typed way.
 * @param url
 * @param options
 */
export default async function request<R = null, H = Headers>(url: string, options: RequestInit) {
    let error: string | null = null
    options = { credentials: "include", ...options }
    let res: Response 
    let response = null
    try {
        res = await fetch(url, options)
        const contentType = res.headers.get("content-type")
        if (!contentType) {
            response = null
        } else if (contentType && contentType.toLowerCase() === "application/json") {
            response = (await res.json()) as ApiResponse<R>
        } else {
            try {
                response = await res.text()
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e: unknown) {
                response = null
            }
        }
    } catch (e) {
        if (e instanceof TypeError && e?.message?.toLowerCase() === "failed to fetch") {
            error = "Network Error Happened. This is most likely an error due to CORS or other network related failure."
        } else {
            error = (e as Error).message
        }
    }
    const headers = res?.headers as H

    return { response, error, headers, raw_response: res }
}
