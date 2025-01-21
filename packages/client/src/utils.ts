import Auth from "./blueprints/auth"
import { FILELIB_API_UPLOAD_URL } from "./constants"
import { FilelibFile } from "./types"
import request from "./request"

/**
 * Retrieve a file's details from FileLib API
 */
export function getFile({
    auth,
    fileID,
    fileURL
}: {
    auth: Auth
    fileID?: string
    fileURL?: string
}): Promise<FilelibFile> {
    return auth.to_headers().then((authHeaders) => {
        const destination = fileURL ?? `${FILELIB_API_UPLOAD_URL}/${fileID}/`
        return request<FilelibFile>(destination, {
            headers: new Headers(authHeaders)
        }).then(({ response: { status, error, data: file } }) => {
            if (!status && error) {
                throw new Error(error)
            }
            return file as FilelibFile
        })
    })
}
