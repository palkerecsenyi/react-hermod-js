# Hermod React

React hooks and context for `hermod-js`

MIT license.

## Install
`hermod-js` is a peer dependency, so you need to install that too. This is intentional to make switching versions easier, as well as using `hermod-js` directly outside this React wrapper (should you need to).

```
npm install react-hermod-js hermod-js
```
```
yarn add react-hermod-js hermod-js
```

The package comes with typings built-in.

## Usage
The point of Hermod is to have a single WebSocket connection between a client and a server. This package uses a context provider to accomplish that.

In the main file of your app (e.g. `index.tsx` or `App.tsx`) wrap your app inside `HermodProvider` and pass a `ServerConfig` (from `hermod-js`) and JWT string as props:

```typescript jsx
import { HermodProvider } from 'react-hermod-js';

const App = () => {
    // HermodProvider will automatically connect to the configured server,
    // and reconnect if the config or token changes.
    return <HermodProvider
        config={{
            hostname: "example.com",
            port: 443,
            secure: true,
            path: "/hermod",
            timeout: 5000,
        }}
        // token is optional
        token={"eyJ..."}
    >
        <RestOfYourApp />
    </HermodProvider>
}
```

Everything nested inside `HermodProvider` can now access these hooks:

```typescript jsx
import { useHermodContext, useHermodRequest } from 'react-hermod-js';

const MyPage = () => {
    const [webSocketRouter, globalError1] = useHermodContext()

    // useHermodRequest takes a Hermod compiler-generated endpoint function
    // as an argument. It infers the typings from that, so lastMessage and send()
    // should be typed correctly.
    const {
        lastMessage,
        isOpen,
        send,
        sessionError,
        globalError,
    } = useHermodRequest(requestMyFavouriteEndpoint)
    
    return <>
        <p>
            Last message: {lastMessage}
        </p>
    </>
}
```

## Caveats
**React Strict Mode**: Due to the way Hermod handles session handshakes, there's no sensible way to rapidly create and then close a session, as would be the case with the double invocations enforced by React Strict Mode. Therefore, this package currently doesn't support it.
