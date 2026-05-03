import { createOmegaHttp } from "@abeyjs/http";
import type { OmegaContainer, OmegaRuntime } from "@abeyjs/runtime";
import { TOK_DEEZER_HTTP } from "../constants/network";

/**
 * DI for the demo table: `OmegaHttp` pointing at Vite dev proxy `/api/deezer` → Deezer API.
 * @see `vite.config.ts` `server.proxy`
 */
export function registerDeezerHttpModule(c: OmegaContainer, runtime: OmegaRuntime): void {
  c.provideFactory(TOK_DEEZER_HTTP, () =>
    createOmegaHttp({
      channel: runtime.channel,
      baseUrl: "/api/deezer",
      source: "deezer-api-docs",
      cache: { enabled: true, ttlMs: 30_000 },
    }),
  );
}
