import { RequestFactory, UFHUOrUndefined } from './hooks';
import { ServiceReadWriter, WebSocketRouter } from 'hermod-js';

type CancelHandler = () => void
export default function serviceReadwriterListener<In extends UFHUOrUndefined, Out extends UFHUOrUndefined>(
    requestFactory: RequestFactory<In, Out>,
    router: WebSocketRouter,
    listener: (open: boolean, error?: Error, data?: Out) => void
): [CancelHandler, ServiceReadWriter<In, Out>] {
    let listenerCancelled = false

    const readwriter = requestFactory(router)
    ;(async () => {
        try {
            await readwriter.open()
            listener(true)
            for await (const data of readwriter.read()) {
                if (listenerCancelled) {
                    try {
                        readwriter.close()
                    } catch (e) {}
                    break
                } else {
                    listener(true, undefined, data)
                }
            }
        } catch (e) {
            if (!listenerCancelled) {
                listener(false, e as Error, undefined)
                listenerCancelled = true
            }
        }
    })()

    return [() => {
        listenerCancelled = true
        try {
            readwriter.close()
        } catch (e) {}
    }, readwriter]
}
