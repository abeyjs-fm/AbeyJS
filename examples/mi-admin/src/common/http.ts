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

const env = import.meta.env;

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

export function createAppHttp(
  runtime: OmegaRuntime,
  options?: { source?: string; withAuth?: boolean },
): OmegaHttp {
  const withAuth = options?.withAuth !== false;
  return createOmegaHttp({
    channel: runtime.channel,
    baseUrl: (env.VITE_API_URL ?? "").trim(),
    source: options?.source ?? "abeyjs-app",
    requestInterceptors: [],
    fetch: withAuth ? buildAuthFetch(runtime) : fetch,
    cache: {
      enabled: true,
      ttlMs: 30_000,
      lookupTtlMs: 5 * 60_000,
      lookupPaths: ["/api/lookups", "/api/catalog", "/api/catalogs", "/api/lookup"],
    },
  });
}

