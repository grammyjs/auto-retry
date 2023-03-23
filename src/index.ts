import { debug as d } from "debug";
const debug = d("auto-retry");

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
    return async (prev, method, payload, signal) => {
        let remainingAttempts = maxRetries
        let result = await prev(method, payload, signal)
        while (!result.ok && remainingAttempts-- > 0) {
            let retry = false
            if (
                typeof result.parameters?.retry_after === 'number' &&
                result.parameters.retry_after <= maxDelay
            ) {
                const timeString = new Date().toLocaleString();
                debug(`[${timeString}] Retrying ${method} after ${result.parameters.retry_after} seconds`);
                await pause(result.parameters.retry_after)
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
