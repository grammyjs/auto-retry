# Router middleware for grammY

Check out [the official documentation](https://grammy.dev/plugins/router.html) for this plugin.

## Quickstart

A router lets you specify a number of middlewares, each of them identified by a string key. You can then pass a routing function that decides based on the context which middleware to choose by returning one of the keys.

```ts
const router = new Router(ctx => {
  // determine route to pick here
  return 'key'
})

router.route('key',       ctx => { ... })
router.route('other-key', ctx => { ... })
router.otherwise(ctx => { ... }) // called if no route matches
bot.use(router)
```

If you use a [custom context type](https://grammy.dev/guide/context.html#customizing-the-context-object) for your bot, you need to pass it when constructing the `Router` instance, too.

```ts
const router = new Router<MyContext>(ctx => { ... })
```
