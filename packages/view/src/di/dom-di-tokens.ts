export const DOM_CHANNEL_TOKEN = "channel";

/**
 * Default factory path used by `<abey-provide token="channel" use-factory="...">`.
 * **`bootstrapOmegaApp`** wires **`globalThis.__abeyDi.channel`** when **`createOmega`** runs.
 */
export const DOM_CHANNEL_FACTORY = "__abeyDi.channel";

// Back-compat aliases (old names).
export const ABEY_DOM_TOKEN_CHANNEL = DOM_CHANNEL_TOKEN;
export const ABEY_DOM_FACTORYPATH_CHANNEL = DOM_CHANNEL_FACTORY;

