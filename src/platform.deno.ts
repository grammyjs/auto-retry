import debug from "https://cdn.skypack.dev/debug@4.3.4";
export { debug };
const DEBUG = "DEBUG";
if (typeof Deno !== "undefined") {
    debug.useColors = () => !Deno.noColor;
    const env = { name: "env", variable: DEBUG } as const;
    const res = await Deno.permissions.query(env);
    let namespace: string | undefined = undefined;
    if (res.state === "granted") namespace = Deno.env.get(DEBUG);
    if (namespace) debug.enable(namespace);
    else debug.disable();
}

export {
    HttpError,
    type Transformer,
} from "https://lib.deno.dev/x/grammy@v1/mod.ts";
