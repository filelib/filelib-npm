"use client"

import "@uppy/core/dist/style.min.css"
import "@uppy/dashboard/dist/style.min.css"

import { Flex, Stack, Text } from "@chakra-ui/react"
import { Dashboard } from "@uppy/react"
import FilelibUppy from "@filelib/uppy"

import Uppy from "@uppy/core"

// Don’t forget to keep the Uppy instance outside your component.
const uppy = new Uppy({ id: "UppyDashboard" }).use(FilelibUppy, {
    auth_key: "6fe1ed21-165e-41e8-8abb-d5bc9953caf2",
    onSuccess: (file) => {
        console.log("FILE UPLOADED SUCCESSFULLY", file)
    },
    chunkSize: 999999,
    ignoreCache: false,
    abortOnFail: false,
    clearCache: false
})

function App() {
    return (
        <Stack minH={"50vh"} direction={{ base: "column", md: "row" }}>
            <Flex w={["100%", "full"]} p={8} flex={1} align={"center"} justify={"center"}>
                <Stack spacing={6} w={"full"} maxW={"lg"}>
                    <Text>Use the following the test the uploader.</Text>
                    <Dashboard uppy={uppy} id={"UppyDashboard"} theme={"dark"} />
                </Stack>
            </Flex>
        </Stack>
    )
}

export default App
