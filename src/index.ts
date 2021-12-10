function pause(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, 1000 * seconds))
}

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
     * Requests to the Telegram servers can sometimes encounter a gateway
     * timeout error (504). According to the MDN Web Docs, a 504 error is
     * usually not something you can fix, but requires a fix by the web server
     * or the proxies you are trying to get access through.
     *
     * (https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/504)
     */
    retryOnGatewayTimeouts: boolean
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
    const retryOnGatewayTimeouts = options?.retryOnGatewayTimeouts ?? false
    return async (prev, method, payload) => {
        let remainingAttempts = maxRetries
        let result = await prev(method, payload)
        while (
            !result.ok &&
            ((typeof result.parameters?.retry_after === 'number' &&
                result.parameters.retry_after <= maxDelay) ||
                (result.error_code === 504 &&
                    retryOnGatewayTimeouts === true)) &&
            remainingAttempts-- > 0
        ) {
            await pause(result.parameters.retry_after)
            result = await prev(method, payload)
        }
        return result
    }
}
