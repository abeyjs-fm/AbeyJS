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
