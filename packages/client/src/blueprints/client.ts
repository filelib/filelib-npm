import Auth from "./auth"
import Config from "../config"
import { FilelibClientOpts } from "../types"
import Uploader from "../uploader"

export default abstract class BaseClient {
    auth: Auth
    config?: Config
    files!: Uploader[]

    constructor({ config }: FilelibClientOpts) {
        this.files = []
        this.config = config
    }

    abstract add_file(props: FilelibClientOpts): void

    abstract upload(props: FilelibClientOpts): void
}
