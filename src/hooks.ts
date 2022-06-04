import { useEffect, useState } from 'react';
import { ServiceReadWriter, UserFacingHermodUnit, WebSocketRouter, ServerConfig } from 'hermod-js';
import { useHermodContext } from './context';

type CancelHandler = () => void

export function useHermodServer(config: ServerConfig, token?: string): [WebSocketRouter | undefined, Error | undefined] {
    const [server, setServer] = useState<WebSocketRouter | undefined>(undefined)
    const [error, setError] = useState<Error | undefined>(undefined)
    useEffect(() => {
        let cancel: undefined | CancelHandler

        (async () => {
            setServer(undefined)
            const newServer = new WebSocketRouter(config, token)
            try {
                await newServer.waitForConnection()
            } catch (e) {
                setError(e as Error)
                return
            }

            setServer(newServer)
            const cancelClose = newServer.onClose(() => {
                setServer(undefined)
            })

            const cancelError = newServer.onError(e => {
                setError(e)
            })

            cancel = () => {
                cancelClose()
                cancelError()
            }
        })()

        return () => {
            if (cancel) {
                cancel()
            }

            if (server?.webSocket.isReady) {
                server.webSocket.close()
            }
        }
    }, [config, token])

    return [server, error]
}

type UFHUOrUndefined = UserFacingHermodUnit | undefined
type RequestFactory<In extends UFHUOrUndefined, Out extends UFHUOrUndefined> =
    (router?: WebSocketRouter) => ServiceReadWriter<In, Out>

export interface HermodRequestInterface<In extends UFHUOrUndefined, Out extends UFHUOrUndefined> {
    lastMessage: Out | undefined
    open: boolean
    send: ((message: In) => void) | undefined
    sessionError: Error | undefined
    globalError: Error | undefined
}

export function useHermodRequest
<In extends UFHUOrUndefined = undefined, Out extends UFHUOrUndefined = undefined>
(request: RequestFactory<In, Out>): HermodRequestInterface<In, Out> {
    const [readwriter, setReadwriter] = useState<ServiceReadWriter<In, Out> | undefined>(undefined)
    const [lastMessage, setLastMessage] = useState<Out | undefined>(undefined)
    const [sessionError, setSessionError] = useState<Error | undefined>(undefined)
    const [open, setOpen] = useState(false)
    const [concluded, setConcluded] = useState(false)
    const [locked, setLocked] = useState(false)
    const [contextServer, contextError] = useHermodContext()

    useEffect(() => {
        const rw = request(contextServer)
        setConcluded(false)
        setLocked(false)
        setOpen(false)
        setReadwriter(rw)
        return () => {
            try {
                rw.close()
            } catch (e) {
                // ignore error if we try to close before a handshake has taken place
            }
            setOpen(false)
        }
    }, [request, contextServer])

    useEffect(() => {
        if (!readwriter || concluded || locked) return

        setLocked(true);
        (async () => {
            try {
                await readwriter.open()
            } catch (e) {
                setConcluded(true)
                setSessionError(e as Error)
                return
            }

            setOpen(true)
            const generator = readwriter.read()
            try {
                for await (const item of generator) {
                    setLastMessage(item)
                }
            } catch (e) {
                setSessionError(e as Error)
            }

            setOpen(false)
            setConcluded(true)
            setLocked(false)
        })()
    }, [readwriter, open, concluded, locked])

    return {
        lastMessage,
        open,
        send: readwriter?.send,
        sessionError,
        globalError: contextError,
    }
}
