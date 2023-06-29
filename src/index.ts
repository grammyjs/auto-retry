function pause(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, 1000 * seconds))
}

/**
 * The default assumption is that auto-retry transformer object
 * isn't shared by multuple bots, and we share delays on a
 * per-method basis
 */
const DEFAULT_WAIT_KEY = (method: string) => method;
const waitUntils = new Map<string, number>();

type AutoRetryTransformer = (...args: any[]) => any

/**
 * Options that can be specified when creating an auto retry transformer
 * function.
 */
export interface AutoRetryOptions {
    /**
     * Determines the maximum number of seconds that should be regarded from the
     * `retry_after` parameter. If the `retry_after` value exceeds this
     * threshold, the error will be passed on, hence failing the request. For
     * instance, this is useful if you don't want your bot to retry sending
     * messages that are too old.
     *
     * Set this value to `Infinity` to disable the threshold.
     *
     * The default value is one hour (3600 seconds).
     */
    maxDelaySeconds: number
    /**
     * Determines the maximum number of times that an API request should be
     * retried. If the request has been retried the specified number of times
     * but still fails, the error will be rethrown, eventually failing the
     * request.
     *
     * Set this value to `Infinity` to disable the threshold.
     *
     * The default value is 3 times.
     */
    maxRetryAttempts: number
    /**
     * Requests to the Telegram servers can sometimes encounter internal server
     * errors (error with status code >= 500). Those are usually not something
     * you can fix, but requires a fix by the web server or the proxies you are
     * trying to get access through. Sometimes, it can also just be an network
     * connection that is temporarily unreliable. Set this option to `true` if
     * the plugin should also retry these error automatically.
     *
     * (https://en.m.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_server_errors)
     */
    retryOnInternalServerErrors: boolean
    /**
     * All method that are sent out from the same waitKey should pause
     * if one of the request receives a 429 response from Telegram.
     * 
     * The default value is per-method basis only
     */
    waitKey: (method: string, payload: any) => string;
}

/**
 * Creates an [API transformer
 * function](https://grammy.dev/advanced/transformers.html) that will check
 * failed API requests for a `retry_after` value, and attempt to perform them
 * again after waiting the specified number of seconds.
 *
 * You can set an option to only retry requests a number of times, or only retry
 * those that to not demand your bot to wait too long.
 *
 * @param options Configuration options
 * @returns The created API transformer function
 */
export function autoRetry(
    options?: Partial<AutoRetryOptions>
): AutoRetryTransformer {
    const maxDelay = options?.maxDelaySeconds ?? 3600
    const maxRetries = options?.maxRetryAttempts ?? 3
    const retryOnInternalServerErrors =
        options?.retryOnInternalServerErrors ?? false
    const waitKey = options?.waitKey ?? DEFAULT_WAIT_KEY;
    return async (prev, method, payload, signal) => {
        const currentWaitKey = waitKey(method, payload);
        let remainingAttempts = maxRetries
        let result: ReturnType<typeof prev> = { ok: false }
        while (!result.ok && remainingAttempts-- >= 0) {
            let retry = false
            const nowSeconds = Math.trunc(Date.now() / 1000)
            if (typeof result.parameters?.retry_after === 'number') {
                waitUntils.set(currentWaitKey, nowSeconds + result.parameters.retry_after)
            }

            const retryAfter = Math.max((waitUntils.get(currentWaitKey) ?? 0) - nowSeconds, 0);
            if (retryAfter <= maxDelay) {
                await pause(retryAfter)
                retry = true
            } else if (
                result.error_code >= 500 &&
                retryOnInternalServerErrors
            ) {
                retry = true
            }
            if (!retry) return result
            else result = await prev(method, payload, signal)
        }
        return result
    }
}
