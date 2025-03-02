export const FILELIB_API_BASE_URL: string = "https://api.filelib.com"
export const FILELIB_API_AUTH_URL: string = `${FILELIB_API_BASE_URL}/auth/`
export const FILELIB_API_AUTH_BROWSER_URL: string = `${FILELIB_API_BASE_URL}/auth/browser/`
export const FILELIB_API_UPLOAD_URL: string = `${FILELIB_API_BASE_URL}/upload/`

// File object related URLS

export const CREDENTIAL_SOURCE_FILE = "file"
export const CREDENTIAL_SOURCE_ENV = "env"
export const CREDENTIAL_SOURCE_DIRECT = "direct"
export const CREDENTIAL_SOURCE_OPTIONS = [CREDENTIAL_SOURCE_FILE, CREDENTIAL_SOURCE_ENV, CREDENTIAL_SOURCE_DIRECT]

export const ENV_API_KEY_IDENTIFIER = "FILELIB_API_KEY"
export const ENV_API_SECRET_IDENTIFIER = "FILELIB_API_SECRET"

// UPLOAD PROPS
export const MB = 2 ** 20
export const MAX_CHUNK_SIZE = 64 * MB
export const MIN_CHUNK_SIZE = 5 * MB

// FILE STATUS; Ref: FILE_UPLOAD_STATUS_HEADER
export const UPLOAD_PENDING = "pending" // Initialized but no parts are sent
export const UPLOAD_STARTED = "started" // Some parts are sent.
export const UPLOAD_CANCELLED = "cancelled" // User or server cancelled the upload.
export const UPLOAD_COMPLETED = "completed" // All parts are uploaded and transfer completed entirely.
export const UPLOAD_FAILED = "failed" // Error occurred during upload progress.

export const AUTHORIZATION_HEADER = "Authorization"
export const CONFIG_STORAGE_HEADER = "Filelib-Config-Storage"
export const CONFIG_PREFIX_HEADER = "Filelib-Config-Prefix"
export const CONFIG_ACCESS_HEADER = "Filelib-Config-Access"
export const UPLOAD_MAX_CHUNK_SIZE_HEADER = "Filelib-Upload-Max-Chunk-Size"
export const UPLOAD_MIN_CHUNK_SIZE_HEADER = "Filelib-Upload-Min-Chunk-Size"
export const UPLOAD_MISSING_PART_NUMBERS_HEADER = "Filelib-Upload-Missing-Part-Numbers"
export const UPLOAD_PART_NUMBER_POSITION_HEADER = "Filelib-Upload-Part-Number-Position"
export const UPLOAD_PART_CHUNK_NUM_HEADER = "Filelib-Upload-Part-Chunk-Number"
export const UPLOAD_CHUNK_SIZE_HEADER = "Filelib-Upload-Chunk-Size"
export const UPLOAD_LOCATION_HEADER = "Location"
export const FILE_UPLOAD_STATUS_HEADER = "Filelib-File-Upload-Status"
export const CONTENT_TYPE_HEADER = "Content-Type"
// Error Headers
export const ERROR_MESSAGE_HEADER = "Filelib-Error-Message"
export const ERROR_CODE_HEADER = "Filelib-Error-Code"
