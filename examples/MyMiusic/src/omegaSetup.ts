import { createOmegaRuntime, type OmegaRuntime } from "@abeyjs/runtime";
import { installMusicOmega } from "./ecosystems/music/omega/music-register.js";
import { registerCommon } from "./common/register-common.js";
import { installArtistOmega } from "./ecosystems/artist/omega/register.js";
import { installAlumnosOmega } from "./ecosystems/alumnos/omega/register.js";

/**
 * Composition root: `OmegaRuntime`.
 */
export function createOmega(): { runtime: OmegaRuntime } {
  const runtime = createOmegaRuntime();
  runtime.registerModule(registerCommon);
  installAlumnosOmega(runtime);
  installArtistOmega(runtime);
  installMusicOmega(runtime);

  // Inspector bridge (DEV only): auto-connect on localhost.
  // Disable with: `?omegaInspector=off`
  if (typeof window !== "undefined") {
    try {
      if (!(import.meta as any).env?.DEV) return { runtime };
      const u = new URL(window.location.href);
      const disable = String(u.searchParams.get("omegaInspector") ?? "").trim().toLowerCase() === "off";
      if (disable) return { runtime };
      const isLocalhost = ["127.0.0.1", "localhost"].includes(String(window.location.hostname ?? ""));
      if (!isLocalhost) return { runtime };

      const hub = "ws://127.0.0.1:7071";
      const appId = "mymuisic-dev";
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
    } catch {
      /* */
    }
  }

  return { runtime };
}
