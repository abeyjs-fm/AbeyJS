import { createOmegaHttp, type OmegaHttp } from "@abeyjs/http";
import type { OmegaRuntime } from "@abeyjs/runtime";
import {
  clearSession,
  extractAuthTokens,
  getAuthToken,
  getRefreshToken,
  redirectToLogin,
  setAuthToken,
  setRefreshToken,
} from "./session.js";

const env = import.meta.env as { VITE_OPENAPI_URL?: string; VITE_API_URL?: string };

const REFRESH_TOKEN_ENDPOINT: string | null = null;

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshToken(runtime: OmegaRuntime): Promise<boolean> {
  if (!REFRESH_TOKEN_ENDPOINT) {
    return false;
  }
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  const refreshHttp = createOmegaHttp({
    channel: runtime.channel,
    baseUrl: (env.VITE_API_URL ?? "").trim(),
    source: "abeyjs-refresh",
  });
  try {
    const body = await refreshHttp.postJson<unknown>(REFRESH_TOKEN_ENDPOINT, { refreshToken });
    const tokens = extractAuthTokens(body);
    if (!tokens.accessToken) {
      return false;
    }
    setAuthToken(tokens.accessToken);
    if (tokens.refreshToken) {
      setRefreshToken(tokens.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

async function ensureRefreshOnce(runtime: OmegaRuntime): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = tryRefreshToken(runtime).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function buildAuthFetch(runtime: OmegaRuntime): typeof fetch {
  return async (input, init = {}) => {
    const withAuthHeaders = (sourceInit: RequestInit): RequestInit => {
      const headers = new Headers(sourceInit.headers ?? {});
      const token = getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return { ...sourceInit, headers };
    };
    let response = await fetch(input, withAuthHeaders(init));
    if (response.status !== 401) {
      return response;
    }
    const refreshed = await ensureRefreshOnce(runtime);
    if (!refreshed) {
      clearSession();
      redirectToLogin();
      return response;
    }
    response = await fetch(input, withAuthHeaders(init));
    if (response.status === 401) {
      clearSession();
      redirectToLogin();
    }
    return response;
  };
}

/**
 * Cliente HTTP de la app: base `VITE_API_URL`, trazas en canal del runtime, caché de lookups.
 * Con `withAuth: true` (defecto) envía Bearer y reintenta con refresh si corresponde.
 */
export function createHttpClient(
  runtime: OmegaRuntime,
  options: {
    baseUrl: string;
    source?: string;
    withAuth?: boolean;
    cache?: Parameters<typeof createOmegaHttp>[0]["cache"];
  },
): OmegaHttp {
  const withAuth = options.withAuth !== false;
  return createOmegaHttp({
    channel: runtime.channel,
    baseUrl: options.baseUrl.trim(),
    source: options.source ?? "abeyjs-http",
    requestInterceptors: [],
    fetch: withAuth ? buildAuthFetch(runtime) : fetch,
    cache: options.cache ?? { enabled: true, ttlMs: 30_000 },
  });
}

export function createAppHttp(runtime: OmegaRuntime, options?: { source?: string; withAuth?: boolean }): OmegaHttp {
  return createHttpClient(runtime, {
    baseUrl: (env.VITE_API_URL ?? "").trim(),
    source: options?.source ?? "abeyjs-connect",
    withAuth: options?.withAuth !== false,
    cache: {
      enabled: true,
      ttlMs: 30_000,
      lookupTtlMs: 5 * 60_000,
      lookupPaths: ["/api/lookups", "/api/catalog", "/api/catalogs", "/api/lookup"],
    },
  });
}

export function postJson<T>(http: OmegaHttp, path: string, body: unknown): Promise<T> {
  return http.postJson<T>(path, body);
}

export function postFormData(http: OmegaHttp, path: string, formData: FormData): Promise<Response> {
  return http.request("POST", path, { body: formData });
}

