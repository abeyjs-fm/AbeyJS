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

/** Production build deployed without **`VITE_DEEZER_HTTP_BASE`**: no browser calls to Deezer (CORS); table demo uses **embedded sample rows** (`artist.demo-data`). */
export function isDeezerProdRelayAbsent(): boolean {
  return import.meta.env.PROD && deezerRelayEnvBase() === "";
}

function productionDeezerRelayMissing(): boolean {
  return isDeezerProdRelayAbsent();
}

/**
 * - **Dev**: Vite proxies `/api/deezer` → `https://api.deezer.com` (`vite.config.ts`).
 * - **Production (GitHub Pages, etc.)**: static hosts cannot proxy `/api/*`. Set
 *   **`VITE_DEEZER_HTTP_BASE`** to a CORS-aware relay URL (deploy `docs/web/edge/deezer-proxy`).
 *   Deezer omits permissive browser CORS — never call **`https://api.deezer.com`** from static prod without that relay.
 */
export function resolveDeezerOmegaHttpBaseUrl(): string {
  const fromEnv = deezerRelayEnvBase();
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  if (import.meta.env.DEV) {
    return "/api/deezer";
  }
  // Prod without relay: dummy base (`fetch` is stubbed in `registerDeezerHttpModule`).
  return "";
}

/**
 * DI for the Deezer-backed table demo (`TOK_DEEZER_HTTP`).
 * @see `resolveDeezerOmegaHttpBaseUrl`
 */
export function registerDeezerHttpModule(c: OmegaContainer, runtime: OmegaRuntime): void {
  c.provideFactory(TOK_DEEZER_HTTP, () => {
    const stubRelay = productionDeezerRelayMissing();
    if (
      stubRelay &&
      typeof console !== "undefined" &&
      typeof console.warn === "function"
    ) {
      console.info(
        "[abeyjs-docs-web] Deezer demo: no VITE_DEEZER_HTTP_BASE — using offline sample catalog (pagination/search still work). For live API: deploy docs/web/edge/deezer-proxy and set Actions secret VITE_DEEZER_HTTP_BASE.",
      );
    }

    const baseUrl =
      stubRelay ? "https://deezer-demo-disabled.invalid" : resolveDeezerOmegaHttpBaseUrl();

    const fetchImpl: typeof fetch | undefined = stubRelay
      ? () =>
          Promise.reject(
            new Error(
              "Deezer demo: configure VITE_DEEZER_HTTP_BASE (Workers relay URL). See docs/web/edge/deezer-proxy/README.md",
            ),
          )
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
