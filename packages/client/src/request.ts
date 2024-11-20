import { ApiResponse } from "./types"

/**
 * Use fetch in a strongly typed way.
 * @param url
 * @param options
 */
export default async function request<R = null, H = Headers>(url: string, options: RequestInit) {
    let error: string | null = null
    options = { credentials: "include", ...options }
    const res = await fetch(url, options)
    let response = null
    try {
        if (url.includes("amazonaws")) {
            response = await res.text()
            console.log("AWS RESPOINSE", response)
        } else {
            response = (await res.json()) as ApiResponse<R>
        }
    } catch (e) {
        error = (e as Error).message
    }
    // const response = (await res.json()) as ApiResponse<R>
    const headers = res.headers as H

    return { response, error, headers, raw_response: res }
}
