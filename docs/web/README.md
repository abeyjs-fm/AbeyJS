# Docs web SPA (`docs/web`)

Vite SPA for guides, package cards, utilities. Maintainer cheat sheet:

## Manual vs generated vs reused

| Responsibility | Maintainer | Generated / toolchain | Reused shared assets |
|----------------|------------|------------------------|----------------------|
| Route **paths**, nav labels/icons, **`pageRoute` / `componentRoute`** loaders (`src/routes.ts`) | ✓ Always | — | `@abeyjs/view` route helpers/types |
| **Package hub** routes/list (`omega-pkg-routes.ts`) and **utils** routes (`utils-routes.ts`) | ✓ When you add pages | — | — |
| **Guide OM shell** (`*.view.ts`): imports, `doc-guide.view.css`, colocated CSS | ✓ Always | — | `src/views/guides/shared/doc-guide.view.css` (Markdown prose styling) |
| Guide **document body** (`app.doc.*.view.html`) | ✓ Either edit HTML **or** author `docs/*.md` | **`npm run generate:guides-html`** overwrites snippet HTML from Markdown | Stable wrapper `<section data-role="doc-guide-root">` emitted by generator |
| **New guide from Markdown**: map folder ↔ `.md` | ✓ Append one **`rows`** entry in **`scripts/generate-guide-html.mjs`** | Generator writes `*.view.html` | — |
| **GitHub Pages** deep-link fallbacks (`dist/<path>/index.html`) | — | **`vite-doc-spa-paths.ts`** ← **`npm run docs:spa-paths:sync`** (runs on **`prebuild`**) reads routes from **`abey-spa-paths.config.json`** targets | **`@abeyjs/view`** `abey-sync-spa-paths` + **`abeyViteSpaHtmlFallbackDirs`** (`vite-docs-static-site`) |
| **`abey-spa-paths.config.json`** | ✓ Rarely — only when route paths live in **new TS files** the scanner must include (default: `routes.ts`, `omega-pkg-routes.ts`, `utils-routes.ts`) | — | CLI + AST in **`@abeyjs/view`** |
| **`vite-doc-spa-paths.ts`** | ✗ Never edit | Regenerated output | Imported by **`vite.config.ts`** |
| **Prod env** (`DOC_SITE_ORIGIN`, `DOCS_SITE_BASE`, Deezer relay URL, CI secrets) | ✓ Repo / Actions | — | **`.env.example`** documents vars |
| **`vite.config.ts`** knobs | ✓ Repo-specific: SEO **`description`/JSON-LD name**, Deezer **`proxy`**, **`port`**; top comment explains the rest | — | **`@abeyjs/view/dev/vite-docs-static-site`**: **`resolveAbeyDocsCanonicalOrigin`**, **`abeyViteDeployBase`**, **`abeyViteCanonicalSitePlugin`**, **`abeyViteSpaHtmlFallbackDirs`** |

Summary: paths and components are authored once in **`routes.ts`** (and related route modules); **SPA path list for static hosting is not hand-maintained**. Prose stays in **`docs/*.md`** + **`generate-guide-html` mapping**, or fully hand-written HTML. **`prebuild`** keeps fallbacks aligned with AST-extracted routes. **Vite** env + deploy behaviour is reused from **`vite-docs-static-site`** so forks mostly edit copy and integrations, not SPA-fallback internals.

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
- **`vite.config.ts`** — imports **`vite-doc-spa-paths.ts`** into **`abeyViteSpaHtmlFallbackDirs`** (+ canonical origin / **`base`** from **`@abeyjs/view/dev/vite-docs-static-site`**).
- **`edge/deezer-proxy/`** — optional Cloudflare relay; prod needs **`secrets.VITE_DEEZER_HTTP_BASE`** on CI (see **`edge/deezer-proxy/README.md`**).

## Long-form docs

- Monorepo + Pages: **`../monorepo-desarrollo.md`**
- Authoring **`docs/*.md`**: **`../README.md`**
