# Deezer CORS proxy (docs table demo)

The Docs SPA calls `/api/deezer` locally via the Vite dev proxy (`vite.config.ts`). **GitHub Pages is static**, so `/api/deezer` hits the Pages host itself and returns **404**.

[Deezer’s public API](https://developers.deezer.com/) works from curl/servers but not from browsers (no usable `Access-Control-Allow-Origin` for GitHub Pages). This Worker forwards **`GET`** to `https://api.deezer.com` and adds permissive CORS headers.

If **`VITE_DEEZER_HTTP_BASE`** is **not** set at build time, the **`/abey-table`** demo does **not** call Deezer from the browser (avoids pointless CORS errors); wire the Worker URL via secret or **`docs/web/.env.production`** so **`fetch`** hits your relay instead.

## One-time deploy (maintainer)

1. Install tooling: `npm i -g wrangler` (or use `npx wrangler`).
2. From `docs/web/edge/deezer-proxy/`: run `wrangler login` once.
3. `wrangler deploy` — note the printed URL (`https://abey-docs-deezer-proxy.<account>.workers.dev`).

## CI / forks

Add **`VITE_DEEZER_HTTP_BASE`** as either:

1. **Repository secret:** Settings → **Secrets and variables** → Actions → **Repository secrets** → New secret.
2. **Environment secret:** Settings → **Environments** → environment **`github-pages`** (exact name — same as **`jobs.deploy.environment.name`** in **`docs-github-pages.yml`**) → **Environment secrets**.

Value = **Worker URL** with **no trailing slash**, e.g. `https://abey-docs-deezer-proxy.foo.workers.dev`.  
**Do not** use `https://api.deezer.com` — the browser will hit CORS on GitHub Pages; the SPA must call your **`*.workers.dev`** relay.

The **`Docs — GitHub Pages`** workflow passes it into `vite build` so `import.meta.env.VITE_DEEZER_HTTP_BASE` is baked into the SPA. Open the workflow run log → **Build docs** step: if the relay is wired you should see **`VITE_DEEZER_HTTP_BASE is non-empty`**. Push or **Run workflow** again after saving the secret.

Forks without the secret see empty/error loads until they deploy their own Worker and set the secret — or **`npm run dev`** with the Vite **`/api/deezer`** proxy locally — or bake **`VITE_DEEZER_HTTP_BASE`** in **`.env.production`** before **`vite build`**.
