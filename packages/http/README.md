# `@abeyjs/http`

Small **`fetch`** wrapper for JSON APIs. Each request is **broadcast on an `OmegaChannel`** (`@abeyjs/core`) under stable topic names (`CH_HTTP_*`), with a **`correlationId`** so listeners can correlate `REQUEST` → `RESPONSE` (and optionally `ERROR`) for the same call.

Design goals:

- One client per **`baseUrl`**, thin helpers (`getJson`, `postJson`, …) without hiding transport details (`request` exposes `Response`).
- **Interceptors** for auth headers, tracing headers, URL rewrites—all before publishing and before `fetch`.
- **Optional in-memory GET cache** keyed by resolved URL; **entity buckets** so a successful mutation can invalidate related GET slices.

See also: JSDoc on `createOmegaHttp`, types, and channel constants in `src/client.ts`.

---

## Installation & build

Listed as a workspace package; consume from the monorepo or publish path you use elsewhere.

```bash
npm run build -w @abeyjs/http
```

**Runtime dependency:** `@abeyjs/core` (`OmegaChannel`, `createCorrelationId`).

---

## Quick start

```ts
import { createChannel } from "@abeyjs/core";
import { createOmegaHttp, CH_HTTP_ERROR } from "@abeyjs/http";

const channel = createChannel();

channel.on(CH_HTTP_ERROR, (payload /*, meta */) => {
  console.warn(payload.method, payload.path, payload.status, payload.body);
});

const http = createOmegaHttp({
  channel,
  baseUrl: "https://api.example.com",
});

const user = await http.getJson<{ id: string }>("/users/me");
```

 **`channel.on`** is the primary listener API (there is no `subscribe` on `OmegaChannel`). The handler receives **`(payload, meta)`** — **`meta.correlationId`** ties **`CH_HTTP_REQUEST`** / **`CH_HTTP_RESPONSE`** / **`CH_HTTP_ERROR`** for one round-trip (**`EventMeta`** also carries `timestamp` and optional **`source`**). **`namespace`** lives on **`OmegaEvent`** when you use **`channel.events.listen` / `onAll`**; `createOmegaHttp` calls **`OmegaChannel.publish`** with **`{ source, correlationId }` only.**

---

## Request lifecycle (single call)

| Order | What happens |
|-------|----------------|
| 1 | Every **`requestInterceptors`** entry runs in order; each may override `url` and/or `init` (last write wins per field you return). |
| 2 | `createCorrelationId()` → **`CH_HTTP_REQUEST`** `{ method, path, url }` with `meta: { source, correlationId }`. |
| 3 | `fetch(url, { ...init, method })`. |
| 4 | **`CH_HTTP_RESPONSE`** `{ method, path, status, ok }` (body not read yet). |
| 5 | If `!ok`, response body is read as text (clone, up to **2000** chars for the error payload), then **`CH_HTTP_ERROR`** with `network: false`. |
| 6 | If `fetch` throws, **`CH_HTTP_ERROR`** with `status: 0`, `network: true`, message/stack trim in `body`, then the error is **rethrown**. |

** Throwing vs publishing:** `request` **never throws** solely because of HTTP status; it returns `Response`. **`getJson` / `postJson` / …** throw **`Error`** with a short `# status` line after consuming the response body.

---

## Channel topics (`CH_HTTP_*`)

| Constant | Listener payload | When |
|----------|------------------|------|
| `CH_HTTP_REQUEST` | `{ method, path, url }` | After interceptors, before `fetch`. |
| `CH_HTTP_RESPONSE` | `{ method, path, status, ok }` | Immediately after `fetch` resolves. |
| `CH_HTTP_ERROR` | `OmegaHttpErrorPayload` | Non-OK response (body snippet) **or** network failure (`status: 0`, `network: true`). |

Use **`meta.correlationId`** on `REQUEST`/`RESPONSE`/`ERROR` to stitch one logical HTTP round-trip in dashboards or loaders.

---

## `OmegaHttp` methods

Created by **`createOmegaHttp(opts)`**.

| Member | Verb / semantics |
|--------|------------------|
| `getJson(path)` | `GET`, `await r.json()`. Honors cache when enabled. Dedupes concurrent GETs sharing the **same resolved URL**. |
| `postJson(path, body)` | `POST`, `Content-Type: application/json`. Response via `await r.json()` (must parse as JSON when `ok`). On success clears **entity cache** bucket for `path`. |
| `putJson` / `patchJson` | `PUT` / `PATCH`; after `ok`, body read as **text** (`null` if empty); otherwise `JSON.parse` (parse failure yields `null` cast—see limitations). Clears entity cache on success. |
| `deletePath(path)` | `DELETE`; **`204`** → `null` without body read, after entity-cache clear. Other success paths read text/JSON like PATCH, then clear the bucket. |
| `request(method, path, init?)` | Full **`Response`**; you own body consumption. Runs interceptors and all channel publishes above. |

**Paths:** Leading slashes optional for relative URLs. Paths (or URLs) beginning with **`http`** bypass `baseUrl` and are used verbatim.

 **`HttpMethod`:** `"GET" | "POST" | "PUT" | "PATCH" | "DELETE"`.

---

## Options (`OmegaHttpOptions`)

| Field | Meaning |
|-------|---------|
| `channel` | **`OmegaChannel`** used for every publish. |
| `baseUrl` | Normalized (**trailing slashes removed**); relative paths concatenate as `` `${baseUrl}/${trimmedRelative}` ``. |
| `fetch` | Optional (`globalThis.fetch` default). Useful in tests or non-browser runtimes. |
| `source` | Becomes **`meta.source`** on publishes (`"omega-http"` by default). |
| `requestInterceptors` | Array of async observers/mutators; see Quick patterns. |
| `cache` | Optional GET cache (`enabled === true` only). |

---

## GET cache (`OmegaHttpCacheOptions`)

Caching applies **only to `getJson`**. **`enabled` must be exactly `true`** (`cache?.enabled !== true` means no cache).

| Field | Default / behaviour |
|-------|---------------------|
| `ttlMs` | `30_000` ms for URLs that are **not** “lookup-like”. |
| `lookupPaths` | `["/api/lookups","/api/catalog","/api/catalogs","/api/lookup"]` — pathname is lowercased; if **any** prefix matches `pathname.startsWith(prefix)`, the longer TTL applies. |
| `lookupTtlMs` | `5 * 60_000` ms for matching lookup/catalog paths. |
| `entityResolver(path, url)` | Returns a **bucket id** (`string`). All GET cache keys grouped under that id are invalidated when a **successful mutation** touches a path resolving to that bucket. If omitted, see **Default entity buckets**. |

 **Cache key** is **`resolveUrl(path)`** — the fully qualified URL string, so `/users` vs `users` collide under the same `baseUrl` as expected.

After **`postJson`, `putJson`, `patchJson`, `deletePath`** succeed (`ok`), **`clearEntityCache(path)`** runs: it resolves **`entityResolver(path, resolvedUrl)`** or the default heuristic, then deletes **every cached GET key** indexed under that bucket and drops any **pending dedup promise** keys for those entries.

---

## Default entity buckets (no custom `entityResolver`)

Path normalization strips query string for segment logic; **`toPathname`** turns absolute URLs into their pathname segment.

Examples (conceptual):

| Path (relative or pathname) | Default bucket |
|----------------------------|----------------|
| `/api/users/123` | `api/users` |
| `/api/items` | `api/items` |
| `/anything/else` | first segment, e.g. `anything` |
| `/` or empty segments | _(no bucket — mutation cache clear is a no-op for entity index)_ |

If you need finer or coarser grouping, supply **`entityResolver`**.

---

## Typical patterns

**Correlated tracing**

```ts
channel.on(CH_HTTP_REQUEST, (_p, meta) => {
  // open span keyed by meta.correlationId
});
channel.on(CH_HTTP_RESPONSE, (_p, meta) => {
  // close span
});
```

 **Auth interceptor**

Merge headers carefully (`Headers`, plain objects, arrays—see Fetch spec):

```ts
requestInterceptors: [
  ({ init }) => ({
    init: {
      ...init,
      headers: new Headers([
        ...(init.headers instanceof Headers
          ? [...init.headers]
          : Object.entries(init.headers ?? {})),
        ["authorization", `Bearer ${token}`],
      ]),
    },
  }),
],
```

Avoid double JSON bodies across interceptors: each interceptor receives the **`init`** from the previous stage.

---

## Limitations & non-goals (today)

- No built-in retries, backoff, or request cancellation wiring (bring your own interceptors/`AbortSignal` in `init`).
- **`putJson` / `patchJson` / `deletePath`** return `null` on empty or non-JSON bodies; invalid JSON parses as **`null`** (typed as generic `T`—caller should narrow).
- **`CH_HTTP_ERROR` body snippet** capped at ~**2000** characters for bus safety.
- Cache is **per client instance**, in-memory only (no shared worker / SSR TTL sync).

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Loader never hears “done” after `getJson` threw | Inspect **`CH_HTTP_ERROR`** and the thrown **`Error`**; caching only skips work on hits—failed GETs still fire `REQUEST`/`RESPONSE`/error. |
| Mutation did not invalidate related GET | Verify **`entityResolver`** or default bucket overlaps the GET URL’s pathname segments. |
| `POST` parses wrong | Success path assumes valid JSON **`r.json()`**; non-JSON 2xx breaks `postJson`. |
| Interceptor does not change URL | Later interceptors overwrite; combine logic or order array intentionally. |

---

## Dependency summary

Depends on **`@abeyjs/core`**. Consumers need **`fetch`** (built-in browser or injected).
