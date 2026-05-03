import { createOmegaHttp } from "@abeyjs/http";
import type { OmegaContainer, OmegaRuntime } from "@abeyjs/runtime";
import { TOK_DEEZER_HTTP } from "../constants/network";

/**
 * - **Dev**: Vite proxies `/api/deezer` → `https://api.deezer.com` (`vite.config.ts`).
 * - **Production (GitHub Pages, etc.)**: static hosts cannot proxy `/api/*`. Set
 *   **`VITE_DEEZER_HTTP_BASE`** to a CORS-aware relay URL (deploy `docs/web/edge/deezer-proxy`).
 *   Deezer omits permissive browser CORS, so **`https://api.deezer.com` alone fails in-browser.
 */
export function resolveDeezerOmegaHttpBaseUrl(): string {
  const raw =
    typeof import.meta.env.VITE_DEEZER_HTTP_BASE === "string"
      ? import.meta.env.VITE_DEEZER_HTTP_BASE.trim()
      : "";
  if (raw.length > 0) {
    return raw.replace(/\/+$/, "");
  }
  if (import.meta.env.DEV) {
    return "/api/deezer";
  }
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      "[abeyjs-docs-web] Deezer demo: missing VITE_DEEZER_HTTP_BASE. Static hosting has no `/api/deezer` proxy. Deploy `docs/web/edge/deezer-proxy` (Wrangler), add repo secret VITE_DEEZER_HTTP_BASE, rebuild.",
    );
  }
  return "https://api.deezer.com";
}

/**
 * DI for the Deezer-backed table demo (`TOK_DEEZER_HTTP`).
 * @see `resolveDeezerOmegaHttpBaseUrl`
 */
export function registerDeezerHttpModule(c: OmegaContainer, runtime: OmegaRuntime): void {
  c.provideFactory(TOK_DEEZER_HTTP, () =>
    createOmegaHttp({
      channel: runtime.channel,
      baseUrl: resolveDeezerOmegaHttpBaseUrl(),
      source: "deezer-api-docs",
      cache: { enabled: true, ttlMs: 30_000 },
    }),
  );
}
