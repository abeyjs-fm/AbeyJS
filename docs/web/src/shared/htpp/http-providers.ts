import { createOmegaHttp } from "@abeyjs/http";
import type { OmegaContainer, OmegaRuntime } from "@abeyjs/runtime";
import { TOK_DEEZER_HTTP } from "../constants/network";

function deezerRelayEnvBase(): string {
  const raw =
    typeof import.meta.env.VITE_DEEZER_HTTP_BASE === "string"
      ? import.meta.env.VITE_DEEZER_HTTP_BASE.trim()
      : "";
  return raw.length > 0 ? raw.replace(/\/+$/, "") : "";
}

/**
 * True when the production bundle was built **without** baking a Worker relay URL.
 * The client still targets the Deezer API over the network, but the browser will only succeed
 * if **`VITE_DEEZER_HTTP_BASE`** is set (CORS). Without it, requests hit **`https://api.deezer.com`**
 * directly and are blocked by CORS.
 */
export function isDeezerProdRelayAbsent(): boolean {
  return import.meta.env.PROD && deezerRelayEnvBase() === "";
}

let loggedDeezerProdCorsHint = false;

/**
 * - **Dev**: Vite proxies **`/api/deezer`** → **`https://api.deezer.com`** (`vite.config.ts`).
 * - **Production**: set **`VITE_DEEZER_HTTP_BASE`** to the Cloudflare Worker URL (`docs/web/edge/deezer-proxy`).
 *   If unset, base falls back to **`https://api.deezer.com`** (same host the relay forwards to); that path
 *   **fails in the browser** without CORS until the secret is configured at build time.
 */
export function resolveDeezerOmegaHttpBaseUrl(): string {
  const fromEnv = deezerRelayEnvBase();
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  if (import.meta.env.DEV) {
    return "/api/deezer";
  }
  return "https://api.deezer.com";
}

/**
 * DI for the Deezer-backed table demo (`TOK_DEEZER_HTTP`). Always uses real **`fetch`** against
 * {@link resolveDeezerOmegaHttpBaseUrl} (no embedded catalog).
 */
export function registerDeezerHttpModule(c: OmegaContainer, runtime: OmegaRuntime): void {
  c.provideFactory(TOK_DEEZER_HTTP, () => {
    const baseUrl = resolveDeezerOmegaHttpBaseUrl();
    if (
      isDeezerProdRelayAbsent() &&
      !loggedDeezerProdCorsHint &&
      typeof console !== "undefined" &&
      typeof console.warn === "function"
    ) {
      loggedDeezerProdCorsHint = true;
      console.warn(
        "[abeyjs-docs-web] Deezer demo: build has no VITE_DEEZER_HTTP_BASE — requests go to https://api.deezer.com and the browser will block them (CORS). Deploy docs/web/edge/deezer-proxy and set the GitHub Actions secret so the SPA uses your Worker URL.",
      );
    }

    return createOmegaHttp({
      channel: runtime.channel,
      baseUrl,
      source: "deezer-api-docs",
      cache: { enabled: true, ttlMs: 30_000 },
    });
  });
}
