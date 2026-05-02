import { createOmegaRuntime, type OmegaRuntime } from "@abeyjs/runtime";
import { environment } from "./environment.js";

/**
 * Composition root: `OmegaRuntime`.
 * Registrá tus intents/flows/agentes acá.
 */
export function createOmega(): { runtime: OmegaRuntime } {
  const runtime = createOmegaRuntime();
  // Ancho por defecto (~80 %) para vistas / slices; sobrescribe con `--abey-slice-max-width` en `:root`.
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--abey-slice-max-width", "80%");
  }

  // Inspector (DEV): solo si `VITE_INSPECTOR_HUB` está definido (.env.development) y el hub corre.
  // Apagar bridge: `?omegaInspector=off`
  if (typeof window !== "undefined") {
    try {
      if (!import.meta.env.DEV) {
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
