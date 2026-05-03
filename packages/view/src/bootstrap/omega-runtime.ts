import type { OmegaRuntime } from "@abeyjs/runtime";
import { normalizePathname } from "../router/path-router.js";

/**
 * Resuelve si el pathname actual es una ruta pública declarada en auth.
 */
export function isPublicPath(pathNorm: string, publicPaths: readonly string[]): boolean {
  for (const raw of publicPaths) {
    if (normalizePathname(raw) === pathNorm) {
      return true;
    }
  }
  return false;
}

/**
 * Crea el {@link OmegaRuntime} de la app cuando `createOmega` está definido (paridad con registrar el motor tras el canal en Flutter).
 */
export function resolveBootstrapRuntime(
  createOmega?: () => { runtime: OmegaRuntime },
): OmegaRuntime | undefined {
  if (!createOmega) {
    return undefined;
  }
  return createOmega().runtime;
}

type GlobalOmega = {
  __abeyRuntime?: OmegaRuntime;
  __abeyDi?: { channel?: () => unknown };
};

/**
 * Writes **`globalThis.__abeyRuntime`** and (**if unset**) **`globalThis.__abeyDi.channel`** so code that resolves the
 * runtime from **`globalThis`** keeps working across lazy chunks and DOM-only entrypoints:
 *
 * - **`@AbeyComponent`** / **`runtimepath`** (default path **`globalThis.__abeyRuntime`**)
 * - **`abey-widget`** and **`DOM_CHANNEL_FACTORY`** consumers
 * - **`abey-table`**: resolves runtime via **`runtime-path`** (**`runtimepath`**) defaulted to **`"__abeyRuntime"`**,
 *   walks **`globalThis`**, uses **`runtime.channel`** in **flow** mode and **`runtime.dispatch`** for intents
 *
 * This does **not** register **`abey-*`** custom elements (call **`registerAbeyJsUi()`** once in **`main.ts`**) nor load
 * table data—you still wire OM intents, **`channel.publish`**, and CSS.
 *
 * **`bootstrapOmegaApp`** calls this after **`resolveBootstrapRuntime`** when **`createOmega`** is provided.
 */
export function exposeBootstrapRuntime(runtime: OmegaRuntime | undefined): void {
  if (!runtime) {
    return;
  }
  const gw = globalThis as unknown as GlobalOmega;
  gw.__abeyRuntime = runtime;
  gw.__abeyDi ??= {};
  gw.__abeyDi.channel ??= (): unknown => gw.__abeyRuntime?.channel;
}

/**
 * Runtime accesible desde vistas lazy montadas por el router (con firma `mount(outlet)`).
 * `bootstrapOmegaApp` lo guarda en `globalThis.__abeyRuntime`.
 */
export function getBootstrapRuntime(): OmegaRuntime {
  const g = globalThis as unknown as { __abeyRuntime?: OmegaRuntime };
  const r = g.__abeyRuntime;
  if (!r) {
    throw new Error("AbeyJs: falta globalThis.__abeyRuntime. Verificá src/main.ts (bootstrapOmegaApp).");
  }
  return r;
}
