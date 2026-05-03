import { createOmegaHttp } from "@abeyjs/http";
import type { OmegaContainer, OmegaRuntime } from "@abeyjs/runtime";
import { TOK_DEEZER_HTTP } from "../constants/network";

function viteDeezerHttpBaseRaw(): string {
  return typeof import.meta.env.VITE_DEEZER_HTTP_BASE === "string"
    ? import.meta.env.VITE_DEEZER_HTTP_BASE.trim()
    : "";
}

function hostnameOfBase(raw: string): string | null {
  const trimmed = raw.replace(/\/+$/, "");
  if (!trimmed.length) return null;
  try {
    const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Never use Deezer’s API origin as `VITE_DEEZER_HTTP_BASE` — browsers block it (CORS) from `github.io`. */
function isBlockedDirectDeezerApiHost(raw: string): boolean {
  const h = hostnameOfBase(raw);
  return h === "api.deezer.com";
}

/**
 * Worker / relay URL baked at build time. Empty if unset, invalid URL, or wrongly set to **`api.deezer.com`**.
 */
function deezerRelayEnvBase(): string {
  const raw = viteDeezerHttpBaseRaw();
  if (!raw.length) return "";
  if (isBlockedDirectDeezerApiHost(raw)) return "";
  const trimmed = raw.replace(/\/+$/, "");
  if (hostnameOfBase(trimmed) === null) return "";
  return trimmed;
}

/**
 * Prod build has no usable relay URL (missing, invalid, or **`https://api.deezer.com`** — that value causes CORS).
 */
export function isDeezerProdRelayAbsent(): boolean {
  return import.meta.env.PROD && deezerRelayEnvBase() === "";
}

/**
 * Secret was set to **`api.deezer.com`** (or equivalent) instead of the Cloudflare Worker URL.
 */
export function isDeezerViteBasePointsAtApiHost(): boolean {
  if (!import.meta.env.PROD) return false;
  const raw = viteDeezerHttpBaseRaw();
  return raw.length > 0 && isBlockedDirectDeezerApiHost(raw);
}

function productionDeezerRelayMissing(): boolean {
  return isDeezerProdRelayAbsent();
}

let loggedDeezerRelayHint = false;
let loggedDirectApiBaseWarning = false;

/**
 * - **Dev**: Vite **`/api/deezer`** proxy → **`api.deezer.com`** (`vite.config.ts`).
 * - **Production**: **`VITE_DEEZER_HTTP_BASE`** = Cloudflare Worker URL (`docs/web/edge/deezer-proxy`), **not** `https://api.deezer.com`.
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
    "Deezer table demo: set VITE_DEEZER_HTTP_BASE to your Workers relay URL (e.g. https://….workers.dev), not https://api.deezer.com. See docs/web/edge/deezer-proxy/README.md.",
  );
}

/**
 * DI for the Deezer-backed table demo (`TOK_DEEZER_HTTP`).
 * Prod without a valid relay URL skips real HTTP until configured.
 */
export function registerDeezerHttpModule(c: OmegaContainer, runtime: OmegaRuntime): void {
  c.provideFactory(TOK_DEEZER_HTTP, () => {
    if (
      isDeezerViteBasePointsAtApiHost() &&
      !loggedDirectApiBaseWarning &&
      typeof console !== "undefined" &&
      typeof console.warn === "function"
    ) {
      loggedDirectApiBaseWarning = true;
      console.warn(
        "[abeyjs-docs-web] VITE_DEEZER_HTTP_BASE must be your Cloudflare Worker URL (…workers.dev), not https://api.deezer.com — the browser cannot call api.deezer.com from GitHub Pages (CORS). Redeploy the Worker and fix the Actions secret.",
      );
    }

    const stubRelay = productionDeezerRelayMissing();
    if (
      stubRelay &&
      !loggedDeezerRelayHint &&
      typeof console !== "undefined" &&
      typeof console.debug === "function"
    ) {
      loggedDeezerRelayHint = true;
      console.debug(
        "[abeyjs-docs-web] Deezer demo: no valid VITE_DEEZER_HTTP_BASE in this prod build — table loads are skipped until the Worker URL is set. See docs/web/edge/deezer-proxy/README.md.",
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
