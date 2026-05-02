import { createOmegaRuntime, type OmegaRuntime } from "@abeyjs/runtime";
import { environment } from "./environment.js";

/**
 * Composition root: `OmegaRuntime`.
 * Mantener este archivo “limpio”: acá solo registrás ecosistemas y/o handlers de intents.
 */
export function createOmega(): { runtime: OmegaRuntime } {
  const runtime = createOmegaRuntime();

  // Inspector bridge (DEV only): auto-connect on localhost.
  // Disable with: `?omegaInspector=off`
  if (typeof window !== "undefined") {
    try {
      if (!(import.meta as any).env?.DEV) {
        return { runtime };
      }
      const u = new URL(window.location.href);
      const disable = String(u.searchParams.get("omegaInspector") ?? "").trim().toLowerCase() === "off";
      if (!disable) {
        const isLocalhost = ["127.0.0.1", "localhost"].includes(String(window.location.hostname ?? ""));
        if (isLocalhost) {
          const hub = environment.inspectorHub;
          if (!hub) return { runtime };
          const appId = "abeyjs-dev";
          const prev = (window as any).__omegaInspectorBridge as { close?: () => void } | undefined;
          try {
            prev?.close?.();
          } catch {
            /* */
          }
          void import("@abeyjs/inspector/app").then(({ connectOmegaInspectorAppBridge }) => {
            const h = connectOmegaInspectorAppBridge(runtime, { url: hub, appId });
            (window as any).__omegaInspectorBridge = h;
          });
        }
      }
    } catch {
      /* */
    }
  }

  return { runtime };
}
