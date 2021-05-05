# Automatically Retry grammY API Requests

Check out [the official documentation](https://grammy.dev/plugins/auto-retry.html) for this grammY plugin.

## Quickstart

An [API transformer function](https://grammy.dev/advanced/transformers.html) let's you modify outgoing HTTP requests on the fly.
This grammY plugin can automatically detect if an API requests fails with a `retry_after` value.
It will then intercept the error, wait the specified period of time, and then retry the request.

```ts
import { autoRetry } from '@grammyjs/auto-retry'

// Install the plugin
bot.api.config.use(autoRetry())
```

You may pass an options object that specifies a maximum number of retries (`maxRetryAttempts`, default: 3), or a threshold for a maximal time to wait (`maxDelaySeconds`, default: 1 hour).
Other errors will be passed on, so the request will fail.

```ts
autoRetry({
    maxRetryAttempts: 1,
    maxDelaySeconds: 5,
})
```
