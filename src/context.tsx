import * as React from 'react';
import { WebSocketRouter, ServerConfig } from 'hermod-js';
import { useHermodServer } from './hooks';
import { ReactNode, useContext } from 'react';

const HermodContext = React.createContext<[WebSocketRouter | undefined, Error | undefined]>([undefined, undefined])

export default function HermodProvider(
    {
        config,
        token,
        children,
    }: {
        config: ServerConfig,
        token?: string
        children?: ReactNode
    }
) {
    const [server, error] = useHermodServer(config, token)
    return <HermodContext.Provider value={[server, error]}>
        {children}
    </HermodContext.Provider>
}

export function useHermodContext() {
    return useContext(HermodContext)
}
