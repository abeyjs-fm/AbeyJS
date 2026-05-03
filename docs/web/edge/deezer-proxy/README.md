# Deezer CORS proxy (docs table demo)

The Docs SPA calls `/api/deezer` locally via the Vite dev proxy (`vite.config.ts`). **GitHub Pages is static**, so `/api/deezer` hits the Pages host itself and returns **404**.

[Deezer’s public API](https://developers.deezer.com/) works from curl/servers but not from browsers (no usable `Access-Control-Allow-Origin` for GitHub Pages). This Worker forwards **`GET`** to `https://api.deezer.com` and adds permissive CORS headers.

If **`VITE_DEEZER_HTTP_BASE`** is **not** set at build time, the **`/abey-table`** page still tries **`fetch`** against **`https://api.deezer.com`**, but the browser will **fail** those calls (same-origin/CORS rules). Baking the Worker URL fixes it.

## One-time deploy (maintainer)

1. Install tooling: `npm i -g wrangler` (or use `npx wrangler`).
2. From `docs/web/edge/deezer-proxy/`: run `wrangler login` once.
3. `wrangler deploy` — note the printed URL (`https://abey-docs-deezer-proxy.<account>.workers.dev`).

## CI / forks

Add a repository **Actions secret** named **`VITE_DEEZER_HTTP_BASE`** with the Worker URL (no trailing slash), e.g. `https://abey-docs-deezer-proxy.foo.workers.dev`.

The **`Docs — GitHub Pages`** workflow exports it so `vite build` bakes `import.meta.env.VITE_DEEZER_HTTP_BASE` into the Deezer Omega HTTP module.

Forks without the secret see failing network loads until they deploy their own Worker and set the secret (or use **`npm run dev`** with the Vite **`/api/deezer`** proxy locally).
