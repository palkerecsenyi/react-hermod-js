import { useCallback, useEffect, useState } from 'react';
import { ServiceReadWriter, UserFacingHermodUnit, WebSocketRouter, ServerConfig } from 'hermod-js';
import { useHermodContext } from './context';
import useAsyncEffect from 'use-async-effect';
import serviceReadwriterListener from './listener';

export function useHermodServer(config: ServerConfig, token?: string): [WebSocketRouter | undefined, Error | undefined] {
    const [server, setServer] = useState<WebSocketRouter | undefined>(undefined)
    const [error, setError] = useState<Error | undefined>(undefined)

    useAsyncEffect(async isActive => {
        setServer(undefined)
        const newServer = new WebSocketRouter(config, token)
        try {
            await newServer.waitForConnection()
        } catch (e) {
            setError(e as Error)
            return
        }

        if (!isActive()) {
            newServer.webSocket.close()
            return
        }

        setServer(newServer)
        const cancelClose = newServer.onClose(() => {
            setServer(undefined)
        })

        const cancelError = newServer.onError(e => {
            setError(e)
        })

        return () => {
            cancelClose()
            cancelError()
            try {
                newServer.webSocket.close()
            } catch {}
        }
    }, cancelListeners => {
        if (cancelListeners) {
            cancelListeners()
        }
    },  [config, token])

    return [server, error]
}

export type UFHUOrUndefined = UserFacingHermodUnit | undefined
export type RequestFactory<In extends UFHUOrUndefined, Out extends UFHUOrUndefined> =
    (router?: WebSocketRouter) => ServiceReadWriter<In, Out>

export interface HermodRequestInterface<In extends UFHUOrUndefined, Out extends UFHUOrUndefined> {
    lastMessage: Out | undefined
    isOpen: boolean
    send: ((message: In) => void) | undefined
    sessionError: Error | undefined
    globalError: Error | undefined
}

export function useHermodRequest<In extends UFHUOrUndefined = undefined, Out extends UFHUOrUndefined = undefined>(
    request: RequestFactory<In, Out>
): HermodRequestInterface<In, Out> {
    const [readwriter, setReadwriter] = useState<ServiceReadWriter<In, Out> | undefined>(undefined)
    const [contextServer, contextError] = useHermodContext()

    const [lastMessage, setLastMessage] = useState<Out | undefined>(undefined)
    const [sessionError, setSessionError] = useState<Error | undefined>(undefined)

    const send = useCallback(async (data: In) => {
        if (!readwriter) {
            throw new Error("Session is not open, cannot send messages.")
        }
        await readwriter.send(data)
    }, [readwriter])

    useEffect(() => {
        if (!contextServer) return

        try {
            const [cancel, newReadwriter] = serviceReadwriterListener(request, contextServer, (open, error, data) => {
                if (open) {
                    setReadwriter(newReadwriter)
                }
                if (error) {
                    setSessionError(error)
                    setReadwriter(undefined)
                }
                if (data) {
                    setLastMessage(data)
                }
            })

            return cancel
        } catch (e) {
            setSessionError(e as Error)
        }
    }, [request, contextServer])

    return {
        lastMessage,
        isOpen: !!readwriter,
        send,
        sessionError,
        globalError: contextError,
    }
}
