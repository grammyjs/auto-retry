# Automatically Retry grammY API Requests

Check out [the official documentation](https://grammy.dev/plugins/auto-retry) for this grammY plugin.
You might also want to read about [broadcasting messages](https://grammy.dev/advanced/flood#how-to-broadcast-messages).

## Quickstart

An [API transformer function](https://grammy.dev/advanced/transformers) lets you modify outgoing HTTP requests on the fly.
This grammY plugin can automatically detect if an API requests fails with a `retry_after` value.
It will then intercept the error, wait the specified period of time, and then retry the request.

```ts
import { autoRetry } from "@grammyjs/auto-retry";

// Install the plugin
bot.api.config.use(autoRetry());
```

You can also pass an options object to configure this plugin.
Check out [the docs](https://grammy.dev/plugins/auto-retry) to read on.
