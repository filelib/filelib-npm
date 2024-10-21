// @ts-expect-error type error
import backloopHttpsOptions from "backloop.dev"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// Out of the box setup
// https://vitejs.dev/config/
// export default defineConfig({
//     plugins: [react()]
// })

// backloop.dev setup.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 4443,
        host: "dev.backloop.dev",
        https: backloopHttpsOptions
    }
    // ... //
})
