class BaseError extends Error {
    constructor(message: string) {
        super(message)
        this.message = message
    }
}

/**
 * Authentication credentials source error.
 * Raised when authentication source provided is invalid.
 * */
export class AuthSourceError extends BaseError {}

/**
 * Raised when there is no access token and it is needed.
 */
export class AuthNoAccessTokenPresent extends BaseError {}

/**
 * Raised when an expected credential is missing
 */
export class AuthMissingCredentialError extends BaseError {}

/**
 * Authentication ENVIRONMENT VARIABLE is not assigned.
 * Raised when authentication environment variable is not provided or invalid.
 * */
export class AuthEnvVariableMissingError extends BaseError {}

/**
 * Authentication option for acquiring credentials from file however file path is not provided.
 * */
export class AuthSourceFileValueMissingError extends BaseError {}

/**
 * Raise when provided credentials file does not exist on given path
 * */

export class AuthSourceFileDoesNotExistError extends BaseError {}

/**INIT UPLOAD DATA {

 * Raised when credentials file does not have data, or it is invalid.
 */
export class AuthSourceFileDataError extends BaseError {}

/**
 * Raise when a FileLib API request returns an error.
 * */
export class FilelibAPIResponseError extends BaseError {}

/**
 * Raise when Config validation fails
 */
export class ConfigValidationError extends BaseError {}

/**
 * Raised when processing a file and it does not have a config assigned.
 * */
export class FileConfigRequiredError extends BaseError {}

/**
 * Raise when a given file ID is already added before.
 */
export class FileIDDuplicateError extends BaseError {}

/**
 * Raise when a given is not a file or does not exist.
 */
export class FileDoesNotExistError extends BaseError {}

/**
 * Raise when an Uploader is initialized and no files to upload.
 */
export class NoFileToUploadError extends BaseError {}

/**
 * Raised when a class/function/method called but it is not implemented.
 */
export class NotImplementedError extends BaseError {}

/**
 * Raise when an upload fails
 */
export class UploadError extends BaseError {}

/**
 * Raise when a network error happens
 * Mostly when a CORS failure, but it cannot be caught as JS would have no access to it.
 * */
export class NetworkError extends BaseError {}

/**
 * Raise when we want to terminate process when AbortController cancels requests but we do not want to throw error.
 * Just terminate process silently.
 * */
export class AbortControllerPassiveError extends BaseError {
    name = "AbortControllerPassiveError"
}
