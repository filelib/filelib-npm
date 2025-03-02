"use client"

import "@uppy/core/dist/style.min.css"
import "@uppy/dashboard/dist/style.min.css"

import { Button, Flex, Stack, Text } from "@chakra-ui/react"
import { Config } from "@filelib/client"
import { Dashboard } from "@uppy/react"
import FilelibUppy from "@filelib/uppy"
import { FilelibUppyOpts } from "@filelib/uppy/src/types"
import StatusBar from "@uppy/status-bar"
import Uppy from "@uppy/core"

// Don’t forget to keep the Uppy instance outside your component.
const uppy = new Uppy({ id: "UppyDashboard" }).use(StatusBar, { hidePauseResumeButton: false }).use(FilelibUppy, {
    authKey: "6fe1ed21-165e-41e8-8abb-d5bc9953caf2",

    onSuccess: (file) => {
        // eslint-disable-next-line no-console
        console.log("Upload Success: Filelib File:", file)
    },
    onError: (metadata, e) => {
        // eslint-disable-next-line no-console
        console.log("Upload Success: Filelib File:", metadata, e)
    },
    useCache: true,
    abortOnFail: false,
    clearCache: false,
    config: new Config({ storage: "s3main" })
} as FilelibUppyOpts)

function App() {
    return (
        <Stack minH={"50vh"} direction={{ base: "column", md: "row" }}>
            <Flex w={["100%", "full"]} p={8} flex={1} align={"center"} justify={"center"}>
                <Stack spacing={6} w={"full"} maxW={"lg"}>
                    <Text>Use the following the test the uploader.</Text>
                    <Button
                        onClick={() => {
                            // eslint-disable-next-line no-console
                            console.log("UPPY", uppy)
                            // eslint-disable-next-line no-console
                            console.log("CLIENT CLIENT", (uppy.getPlugin("Filelib") as FilelibUppy).client)
                            // eslint-disable-next-line no-console
                            console.log("CLIENT FILES", (uppy.getPlugin("Filelib") as FilelibUppy).client.files)
                        }}
                    >
                        {" "}
                        Log Client
                    </Button>
                    <Dashboard uppy={uppy} id={"UppyDashboard"} theme={"dark"} />
                </Stack>
            </Flex>
        </Stack>
    )
}

export default App
