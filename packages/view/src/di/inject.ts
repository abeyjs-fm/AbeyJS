import type { OmegaToken } from "@abeyjs/runtime";
import type { OmegaRuntime } from "@abeyjs/runtime";
import { getBootstrapRuntime } from "../bootstrap/omega-runtime.js";

/**
 * Injection for views: resolves from the runtime DI container (`runtime.get(...)`).
 * Requires `bootstrapOmegaApp` (or app) to expose the runtime.
 */
export function inject<T>(token: OmegaToken): T {
  const runtime: OmegaRuntime = getBootstrapRuntime();
  return runtime.get<T>(token);
}

export function tryInject<T>(token: OmegaToken): T | undefined {
  const runtime: OmegaRuntime = getBootstrapRuntime();
  return runtime.tryGet<T>(token);
}

