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
 * Prod build baked **without** a Worker relay URL (`VITE_DEEZER_HTTP_BASE` empty): the SPA cannot call
 * `https://api.deezer.com` from `github.io` (CORS). Requests are deferred until relay is configured.
 */
export function isDeezerProdRelayAbsent(): boolean {
  return import.meta.env.PROD && deezerRelayEnvBase() === "";
}

function productionDeezerRelayMissing(): boolean {
  return isDeezerProdRelayAbsent();
}

let loggedDeezerRelayHint = false;

/**
 * - **Dev**: Vite **`/api/deezer`** proxy → **`api.deezer.com`** (`vite.config.ts`).
 * - **Production**: **`VITE_DEEZER_HTTP_BASE`** = Cloudflare Worker URL (`docs/web/edge/deezer-proxy`), via
 *   Actions secret or **`docs/web/.env.production`** before **`vite build`**.
 */
export function resolveDeezerOmegaHttpBaseUrl(): string {
  const fromEnv = deezerRelayEnvBase();
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  if (import.meta.env.DEV) {
    return "/api/deezer";
  }
  return "";
}

/** Message when prod has no relay; avoids firing a doomed `fetch` to Deezer (CORS noise). */
export function deezerRelayConfigurationError(): Error {
  return new Error(
    "Deezer table demo: set VITE_DEEZER_HTTP_BASE to your Workers relay URL (docs/web/edge/deezer-proxy). See GitHub Actions secret or docs/web/.env.production.",
  );
}

/**
 * DI for the Deezer-backed table demo (`TOK_DEEZER_HTTP`).
 * Prod without **`VITE_DEEZER_HTTP_BASE`** skips real HTTP until configured (see {@link deezerRelayConfigurationError}).
 */
export function registerDeezerHttpModule(c: OmegaContainer, runtime: OmegaRuntime): void {
  c.provideFactory(TOK_DEEZER_HTTP, () => {
    const stubRelay = productionDeezerRelayMissing();
    if (
      stubRelay &&
      !loggedDeezerRelayHint &&
      typeof console !== "undefined" &&
      typeof console.debug === "function"
    ) {
      loggedDeezerRelayHint = true;
      console.debug(
        "[abeyjs-docs-web] Deezer demo: no VITE_DEEZER_HTTP_BASE in this prod build — table loads are skipped until the Worker URL is set (GH Actions secret or docs/web/.env.production). See docs/web/edge/deezer-proxy/README.md.",
      );
    }

    const baseUrl = stubRelay ? "https://abey-docs-deezer-not-configured.invalid" : resolveDeezerOmegaHttpBaseUrl();
    const fetchImpl: typeof fetch | undefined = stubRelay
      ? () => Promise.reject(deezerRelayConfigurationError())
      : undefined;

    return createOmegaHttp({
      channel: runtime.channel,
      baseUrl,
      fetch: fetchImpl,
      source: "deezer-api-docs",
      cache: { enabled: true, ttlMs: 30_000 },
    });
  });
}
