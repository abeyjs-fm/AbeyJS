# Docs web SPA (`docs/web`)

Vite SPA for guides, package cards, utilities. Maintainer cheat sheet:

## Scripts (`package.json`)

| Script | Purpose |
|--------|---------|
| **`npm run dev`** | Dev server (`5190`): Vite proxy `/api/deezer` → Deezer (table demo). |
| **`npm run build`** | `prebuild` runs **`docs:spa-paths:sync`**, then `tsc` + `vite build`. |
| **`npm run docs:spa-paths:sync`** | Regenerates **`vite-doc-spa-paths.ts`** from **`abey-spa-paths.config.json`** via **`@abeyjs/view`** `abey-sync-spa-paths` (wrapped by **`scripts/run-abey-sync-spa-paths.mjs`**). Needed when routes change paths; **`prebuild`** usually covers it. |
| **`npm run generate:guides-html`** | Runs **`scripts/generate-guide-html.mjs`**: maps **`docs/*.md`** → **`src/views/guides/**/app.doc.*.view.html`**. Run after editing monorepo markdown guides. |

## Key files

- **`abey-spa-paths.config.json`** — AST scan targets for static-host deep links (**GitHub Pages**); no Markdown.
- **`scripts/generate-guide-html.mjs`** — Markdown → OM HTML snippets (see **`rows`** for `*.md` ↔ guide folder mapping).
- **`vite.config.ts`** — `docsSpaHtmlFallbackDirs`: copies **`dist/index.html`** per path in **`vite-doc-spa-paths.ts`**.
- **`edge/deezer-proxy/`** — optional Cloudflare relay; prod needs **`secrets.VITE_DEEZER_HTTP_BASE`** on CI (see **`edge/deezer-proxy/README.md`**).

## Long-form docs

- Monorepo + Pages: **`../monorepo-desarrollo.md`**
- Authoring **`docs/*.md`**: **`../README.md`**
