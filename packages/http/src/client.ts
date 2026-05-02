import { createCorrelationId, type CorrelationId, type OmegaChannel } from "@abeyjs/core";

/**
 * ## Role
 *
 * Implements **`createOmegaHttp`**: wrappers around **`fetch`** that publish typed lifecycle events on
 * **`OmegaChannel`**, optionally cache GET responses, and optionally drop cache buckets after mutating verbs.
 *
 * ## Per-request lifecycle
 *
 * Interceptors (in registration order) → **`CH_HTTP_REQUEST`** → **`fetch`** → **`CH_HTTP_RESPONSE`**.
 * Additional **`CH_HTTP_ERROR`** when HTTP status is not OK **or** `fetch` rejects (same `meta.correlationId` as preceding events where applicable).
 *
 * ## Further reading
 *
 * Default TTLs, default entity buckets (`api/<segment>`), lookup path prefixes, and troubleshooting are documented in **`README.md`**.
 */

/** Dispatched immediately before `fetch` (after interceptors); payload `{ method, path, url }`. */
export const CH_HTTP_REQUEST = "omega/http:request" as const;
/** Dispatched when `fetch` resolves; listener sees status/`ok` before any consumer reads the body. */
export const CH_HTTP_RESPONSE = "omega/http:response" as const;
/** Dispatched when the response is not OK (`network: false`) or `fetch` throws (`network: true`, `status: 0`). */
export const CH_HTTP_ERROR = "omega/http:error" as const;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Payload for **`CH_HTTP_ERROR`**: failed HTTP semantics or rejected `fetch`. */
export type OmegaHttpErrorPayload = {
  method: HttpMethod;
  path: string;
  /** HTTP status code, or `0` when `fetch` failed before any response (network, DNS, CORS, abort, etc.). */
  status: number;
  /** Truncated plain text (~2000 chars) from the HTTP body **or** a short thrown-error summary including stack. */
  body: string;
  /** Set when `fetch` rejects; distinguishes transport failures from typed HTTP statuses. */
  network?: boolean;
};

/**
 * Observes / mutates a request **before** it is published under `CH_HTTP_REQUEST`.
 * Return `{}`/`void` to leave values unchanged; return partial replacements to overwrite `url` and/or **`init`** (merged by the caller across the chain).
 */
export type OmegaHttpRequestInterceptor = (ctx: {
  method: HttpMethod;
  /** Original caller `path` (may still be relative if `resolveUrl` not applied externally). */
  path: string;
  /** Resolved URL passed to `fetch` after preceding interceptors (latest wins). */
  url: string;
  init: RequestInit;
}) => { url?: string; init?: RequestInit } | void | Promise<{ url?: string; init?: RequestInit } | void>;

/** Opt-in GET response cache (`enabled` must be exactly `true`). */
export type OmegaHttpCacheOptions = {
  enabled?: boolean;
  ttlMs?: number;
  /** Longer TTL for URLs under `lookupPaths`. */
  lookupTtlMs?: number;
  /** Path prefixes (pathname match) using `lookupTtlMs`; defaults include `/api/catalog`, `/api/lookups`, … */
  lookupPaths?: string[];
  /** Bucket key for mutation-driven invalidation; falls back to heuristics from the path when omitted. */
  entityResolver?: (path: string, url: string) => string | undefined;
};

export type OmegaHttpOptions = {
  channel: OmegaChannel;
  /** Base URL without trailing slash; relative paths join here. Absolute `http…` paths skip the base. */
  baseUrl: string;
  fetch?: typeof fetch;
  /** `meta.source` on every channel publish (`"omega-http"` default). */
  source?: string;
  requestInterceptors?: OmegaHttpRequestInterceptor[];
  cache?: OmegaHttpCacheOptions;
};

export interface OmegaHttp {
  /**
   * `GET`; parses JSON (`r.json`). When cache is **`enabled:true`**, skips network on fresh hits keyed by **`resolveUrl(path)`**.
   * Coalesces simultaneous GETs awaiting the **same resolved URL**.
   *
   * Throws if `!r.ok` after reading **`r.text`** for error message snippet.
   */
  getJson: <T>(path: string) => Promise<T>;
  /** `POST` JSON; success path parses **`r.json`**. Throws if `!ok`. Clears entity cache bucket derived from **`path`** on success. */
  postJson: <T>(path: string, body: unknown) => Promise<T>;
  /**
   * `PUT` JSON; consumes body as **`text`** (empty ⇒ `null` as **`T`**). Parses JSON when non-empty (`null` when parse fails).
   * Throws if `!ok`. Clears entity cache bucket on success.
   */
  putJson: <T>(path: string, body: unknown) => Promise<T>;
  /** Same semantics as **`putJson`** with `PATCH` verb. */
  patchJson: <T>(path: string, body: unknown) => Promise<T>;
  /**
   * `DELETE`; **`204`** → `null` (no body) + entity-cache clear. Other `ok` responses use text/JSON decoding like **`patchJson`**, then clear cache.
   * Throws when `!ok`.
   */
  deletePath: (path: string) => Promise<unknown | null>;
  /**
   * Low-level **`Response`** accessor: still allocates **`correlationId`**, runs interceptors, and publishes **`CH_HTTP_*`**.
   * Does **not** throw on HTTP error status—it only throws when `fetch` rejects.
   */
  request: (method: HttpMethod, path: string, init?: RequestInit) => Promise<Response>;
}

function toPathname(input: string): string {
  if (input.startsWith("http")) {
    try {
      return new URL(input).pathname;
    } catch {
      return input;
    }
  }
  return input;
}

function defaultEntityTag(path: string): string | undefined {
  const pathname = toPathname(path);
  const clean = pathname.split("?")[0] ?? pathname;
  const segments = clean.split("/").filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }
  if (segments[0] === "api" && segments.length >= 2) {
    return `api/${segments[1]}`;
  }
  return segments[0];
}

/**
 * Instantiate a correlated HTTP façade bound to **`opts.baseUrl`** and **`opts.channel`**.
 *
 * **Events:** every **`request`** (including helpers) assigns a **`correlationId`** via `publish` metadata so listeners can join
 * **`CH_HTTP_REQUEST`** / **`CH_HTTP_RESPONSE`** / **`CH_HTTP_ERROR`** for tracing.
 *
 * **Errors:**
 * - **`request`**: emits **`CH_HTTP_ERROR`** on network failure (`network: true`, `status: 0`), then **rethrows**; on non-OK HTTP,
 *   emits **`CH_HTTP_ERROR`** with response text slice, **returns `Response`**.
 * - **Helpers** (`getJson`, …): on non-OK or bad JSON expectations, **`throw`** `Error`; network errors propagate after **`CH_HTTP_ERROR`**.
 *
 * **Cache:** **`opts.cache.enabled === true`** enables GET caching and entity invalidation; see **`README.md`** for defaults (`ttlMs`, lookup paths, entity buckets).
 */
export function createOmegaHttp(opts: OmegaHttpOptions): OmegaHttp {
  const f = opts.fetch ?? globalThis.fetch;
  const base = opts.baseUrl.replace(/\/+$/, "");
  const source = opts.source ?? "omega-http";
  const interceptors = opts.requestInterceptors ?? [];
  const cacheCfg = opts.cache ?? {};
  const cacheEnabled = cacheCfg.enabled === true;
  const defaultTtlMs = cacheCfg.ttlMs ?? 30_000;
  const lookupTtlMs = cacheCfg.lookupTtlMs ?? 5 * 60_000;
  const lookupPaths = cacheCfg.lookupPaths ?? ["/api/lookups", "/api/catalog", "/api/catalogs", "/api/lookup"];
  const responseCache = new Map<string, { data: unknown; expiresAt: number; entityTag?: string }>();
  const pendingGetJson = new Map<string, Promise<unknown>>();
  const entityToKeys = new Map<string, Set<string>>();

  function resolveUrl(path: string): string {
    return path.startsWith("http") ? path : `${base}/${path.replace(/^\/+/, "")}`;
  }

  function resolveEntityTag(path: string, url: string): string | undefined {
    return cacheCfg.entityResolver?.(path, url) ?? defaultEntityTag(path);
  }

  function addEntityCacheIndex(entityTag: string | undefined, cacheKey: string): void {
    if (!entityTag) {
      return;
    }
    const set = entityToKeys.get(entityTag) ?? new Set<string>();
    set.add(cacheKey);
    entityToKeys.set(entityTag, set);
  }

  function clearEntityCache(path: string): void {
    if (!cacheEnabled) {
      return;
    }
    const url = resolveUrl(path);
    const entityTag = resolveEntityTag(path, url);
    if (!entityTag) {
      return;
    }
    const keys = entityToKeys.get(entityTag);
    if (!keys) {
      return;
    }
    for (const key of keys) {
      responseCache.delete(key);
      pendingGetJson.delete(key);
    }
    entityToKeys.delete(entityTag);
  }

  function ttlForPath(path: string): number {
    const pathname = toPathname(path).toLowerCase();
    const isLookup = lookupPaths.some((p) => pathname.startsWith(p.toLowerCase()));
    return isLookup ? lookupTtlMs : defaultTtlMs;
  }

  async function request(method: HttpMethod, path: string, init: RequestInit = {}): Promise<Response> {
    let url = resolveUrl(path);
    let reqInit: RequestInit = init;
    for (const it of interceptors) {
      const maybe = await it({ method, path, url, init: reqInit });
      if (maybe?.url) {
        url = maybe.url;
      }
      if (maybe?.init) {
        reqInit = maybe.init;
      }
    }
    const correlationId: CorrelationId = createCorrelationId();
    const meta = { source, correlationId } as const;
    opts.channel.publish<typeof CH_HTTP_REQUEST, { method: HttpMethod; path: string; url: string }>(CH_HTTP_REQUEST, { method, path, url }, meta);
    try {
      const r = await f(url, { ...reqInit, method });
      opts.channel.publish<typeof CH_HTTP_RESPONSE, { method: HttpMethod; path: string; status: number; ok: boolean }>(CH_HTTP_RESPONSE, { method, path, status: r.status, ok: r.ok }, meta);
      if (!r.ok) {
        const body = await r
          .clone()
          .text()
          .catch(() => "");
        opts.channel.publish<typeof CH_HTTP_ERROR, OmegaHttpErrorPayload>(CH_HTTP_ERROR, {
          method,
          path,
          status: r.status,
          body: body.slice(0, 2_000),
          network: false,
        }, meta);
      }
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      const body = stack ? `${msg}\n${stack}`.slice(0, 2_000) : msg.slice(0, 2_000);
      opts.channel.publish<typeof CH_HTTP_ERROR, OmegaHttpErrorPayload>(CH_HTTP_ERROR, {
        method,
        path,
        status: 0,
        body,
        network: true,
      }, meta);
      throw err;
    }
  }

  return {
    request,
    getJson: async <T,>(path: string): Promise<T> => {
      const cacheKey = resolveUrl(path);
      if (cacheEnabled) {
        const hit = responseCache.get(cacheKey);
        if (hit && hit.expiresAt > Date.now()) {
          return hit.data as T;
        }
        if (hit && hit.expiresAt <= Date.now()) {
          responseCache.delete(cacheKey);
        }
        const pending = pendingGetJson.get(cacheKey);
        if (pending) {
          return (await pending) as T;
        }
      }
      const fetchPromise = (async (): Promise<T> => {
        const r = await request("GET", path);
        if (!r.ok) {
          const t = await r.text();
          throw new Error(`GET ${path} -> ${r.status} ${t.slice(0, 200)}`);
        }
        const data = (await r.json()) as T;
        if (cacheEnabled) {
          const ttl = Math.max(0, ttlForPath(path));
          const entityTag = resolveEntityTag(path, cacheKey);
          responseCache.set(cacheKey, {
            data,
            entityTag,
            expiresAt: Date.now() + ttl,
          });
          addEntityCacheIndex(entityTag, cacheKey);
        }
        return data;
      })();
      if (cacheEnabled) {
        pendingGetJson.set(cacheKey, fetchPromise as Promise<unknown>);
      }
      try {
        return await fetchPromise;
      } finally {
        pendingGetJson.delete(cacheKey);
      }
    },
    postJson: async <T,>(path: string, body: unknown): Promise<T> => {
      const r = await request("POST", path, {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`POST ${path} -> ${r.status} ${t.slice(0, 200)}`);
      }
      clearEntityCache(path);
      return (await r.json()) as T;
    },
    putJson: async <T,>(path: string, body: unknown): Promise<T> => {
      const r = await request("PUT", path, {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`PUT ${path} -> ${r.status} ${t.slice(0, 200)}`);
      }
      clearEntityCache(path);
      const t = await r.text();
      if (t.length === 0) {
        return null as T;
      }
      try {
        return JSON.parse(t) as T;
      } catch {
        return null as T;
      }
    },
    patchJson: async <T,>(path: string, body: unknown): Promise<T> => {
      const r = await request("PATCH", path, {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`PATCH ${path} -> ${r.status} ${t.slice(0, 200)}`);
      }
      clearEntityCache(path);
      const t = await r.text();
      if (t.length === 0) {
        return null as T;
      }
      try {
        return JSON.parse(t) as T;
      } catch {
        return null as T;
      }
    },
    deletePath: async (path: string): Promise<unknown | null> => {
      const r = await request("DELETE", path, {});
      if (r.status === 204) {
        clearEntityCache(path);
        return null;
      }
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`DELETE ${path} -> ${r.status} ${t.slice(0, 200)}`);
      }
      clearEntityCache(path);
      const t = await r.text();
      if (t.length === 0) {
        return null;
      }
      try {
        return JSON.parse(t) as unknown;
      } catch {
        return null;
      }
    },
  };
}
