const AUTH_TOKEN_KEY = "abeyjs.auth.token";
const AUTH_REFRESH_TOKEN_KEY = "abeyjs.auth.refreshToken";

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY)?.trim() ?? "";
}

export function setAuthToken(token: string): void {
  const t = token.trim();
  if (t) {
    localStorage.setItem(AUTH_TOKEN_KEY, t);
  }
}

export function getRefreshToken(): string {
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)?.trim() ?? "";
}

export function setRefreshToken(token: string): void {
  const t = token.trim();
  if (t) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, t);
  }
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
}

export function extractAuthTokens(payload: unknown): { accessToken: string | null; refreshToken: string | null } {
  if (!payload || typeof payload !== "object") {
    return { accessToken: null, refreshToken: null };
  }
  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const pick = (candidates: unknown[]): string | null => {
    for (const c of candidates) {
      if (typeof c === "string" && c.trim() !== "") {
        return c.trim();
      }
    }
    return null;
  };
  const accessToken = pick([data.accessToken, data.token, data.jwt, root.accessToken, root.token, root.jwt]);
  const refreshToken = pick([data.refreshToken, data.refresh, root.refreshToken, root.refresh]);
  return { accessToken, refreshToken };
}

export function hasSession(): boolean {
  return getAuthToken().length > 0;
}

export function redirectToLogin(): void {
  if (window.location.pathname === "/" || window.location.pathname === "/login") {
    return;
  }
  window.location.assign("/login");
}

export function ensureAuthenticated(): boolean {
  if (hasSession()) {
    return true;
  }
  redirectToLogin();
  return false;
}

