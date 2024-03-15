import { debug as d } from "./platform.deno.ts";
const debug = d("grammy:auto-retry");

const ONE_HOUR = 60 * 60 * 1000; // ms
const INITIAL_LAST_DELAY = 3000; // ms

function pause(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
}

type AutoRetryTransformer = (...args: any[]) => any;

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
     * The default value is `Infinity`. This means that the threshold is
     * disabled. The plugin will wait any number of seconds.
     */
    maxDelaySeconds: number;
    /**
     * Determines the maximum number of times that an API request should be
     * retried. If the request has been retried the specified number of times
     * but still fails, the error will be rethrown, eventually failing the
     * request.
     *
     * The default value is `Infinity`. This means that the threshold is
     * disabled. The plugin will attempt to retry requests indefinitely.
     */
    maxRetryAttempts: number;
    /**
     * Requests to the Telegram servers can sometimes encounter internal server
     * errors (error with status code >= 500). Those are usually not something you
     * can fix. They often are temporary networking issues, but even if they
     * persist, they require a fix by the web server or any potential proxies. It
     * is therefore the best strategy to retry such errors automatically, which is
     * what this plugin does by default.
     *
     * Set this option to `true` if the plugin should rethrow internal server
     * errors rather than retrying them automatically.
     *
     * (https://en.m.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_server_errors)
     */
    rethrowInternalServerErrors: boolean;
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
    options?: Partial<AutoRetryOptions>,
): AutoRetryTransformer {
    const maxDelay = options?.maxDelaySeconds ?? Infinity;
    const maxRetries = options?.maxRetryAttempts ?? Infinity;
    const rethrowInternalServerErrors = options?.rethrowInternalServerErrors ??
        false;
    return async (prev, method, payload, signal) => {
        let remainingAttempts = maxRetries;
        let result = await prev(method, payload, signal);
        let lastDelay = INITIAL_LAST_DELAY;
        while (!result.ok && remainingAttempts-- > 0) {
            let retry = false;
            if (
                typeof result.parameters?.retry_after === "number" &&
                result.parameters.retry_after <= maxDelay
            ) {
                debug(
                    `Hit rate limit, will retry '${method}' after ${result.parameters.retry_after} seconds`,
                );
                await pause(result.parameters.retry_after);
                lastDelay = INITIAL_LAST_DELAY;
                retry = true;
            } else if (
                result.error_code >= 500 &&
                !rethrowInternalServerErrors
            ) {
                await pause(lastDelay);
                // exponential backoff, capped at one hour
                lastDelay = Math.min(ONE_HOUR, lastDelay + lastDelay);
                retry = true;
            }
            if (!retry) return result;
            else result = await prev(method, payload, signal);
        }
        return result;
    };
}
