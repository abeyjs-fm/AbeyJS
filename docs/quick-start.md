# Quick start

The CLI gives you reproducible projects. This guide lists **exactly which files to touch** after `npm run dev`.

## Create a new project

Install the binary (`npm i -g @abeyjs/cli`) or use `npx` without a global install:

```bash
npx @abeyjs/cli init my-app --template admin
cd my-app
npm run dev
```

### Important `init` flags

| Flag | Value | Effect |
|------|--------|--------|
| `--template` | `admin` | AbeyJS admin shell: sidebar, app bar, theme; base for most “product” examples. |
| | `abeyjs` · `empty` | Vite + OM + lighter sample views, less prefab admin chrome. |
| | `minimal` | Minimal scaffold (useful when isolating `@abeyjs/core` without full view). |
| `--shell` | `dashboard` (admin default) vs `appbar` | Only with `admin`: classic sidebar vs more compact variant. |
| `--skip-install` | | Skip `npm install` after scaffolding (`SKIP_ABEYJS_SCAFFOLD_INSTALL=1` from env does the same). |

## Generated repo map (`admin`)

| Typical path | Responsibility |
|-------------|-----------------|
| `src/main.ts` | Single entry: **`bootstrapOmegaApp`**, **`omega-default.css`**, **`import "/abey-styles.js"`** from `abey.json`. Optionally **`fetchSidebarNav`** and **`buildRoutesFromApi`** before **`shell.routes`**. |
| `src/routes.ts` | **`AppRoute[]`**: **`componentRoute`** / **`pageRoute`**; URLs and what each mounts. |
| `src/omegaSetup.ts` | **`createOmegaRuntime()`**, module registry, intent listeners. Missing registration here ⇒ dispatch into the void. |
| `vite.config.ts` | `plugins`: include **`abeyVitePlugin()`**. Optionally **`@abeyjs/view/dev/vite-logger`** in dev for OM compile logs. |
| `abey.json` | **`styles`** the plugin bundles as **`/abey-styles.js`**. Missing + no imports ⇒ bare or incomplete UI. |
| `index.html` | **`#app`**. If using FA shell icons, declare Font Awesome here (shell uses **`fa-solid`**, etc.). |
| `src/views/**/*.view.html` · **`.view.ts`** | OM screens. Convention: **`app.<feature>.view.*`** aligned with **`abeyjs generate ecosystem`**. |
| `public/mock-nav.json` | Optional dev: **`{ "items": [ { path, label, navIconFa?, children? } ] }`** to test server menu without a backend. |

## Must-have imports (`main.ts`)

1. **`import "/abey-styles.js"`** — plugin resolves the bundle from `abey.json`. Skip this **and** expect global OM/UI styles ⇒ broken prod build footgun when copying odd `index.html`.
2. **`import "@abeyjs/view/theme/omega-default.css"`** — **`--abey-*` tokens**, shell chrome, list/form baseline.

Verify **`tsconfig.json`**: template projects enable **`experimentalDecorators`** for **`@AbeyComponent`** views.

## Minimal `abey.json` and why

```json
{
  "styles": ["./src/styles/global.css"]
}
```

Paths are relative to `abey.json`. Change a token there → Vite hashes and HMR like any CSS. For OM table UI some projects also list **`@abeyjs/uikit/styles/abey-table.css`**.

## Docs web in this monorepo

After cloning AbeyJs, browse this same content compiled as OM views:

```bash
# repo root
npm install
npm run docs:dev
```

Default port **5190**. Markdown in **`docs/*.md`** becomes guide HTML via **`npm run generate:guides-html`** inside **`docs/web`**.

Next: **`/guides/bootstrap-shell`**.

## Deploy your app (production)

CLI templates are **Vite SPAs** (`appType: "spa"` in `vite.config.ts`). Deploying means building static assets and serving them like any other Vite/React app—plus a few AbeyJs-specific habits.

### Build and smoke-test locally

```bash
npm ci          # or npm install
npm run build   # emits dist/
npm run preview # optional: Vite serves dist/
```

Confirm the browser loads **JS/CSS** from `dist` (network tab shows **200** on hashed assets—not HTML mis-served as script).

### Production checklist (AbeyJs)

| Requirement | Why |
|-------------|-----|
| **`import "/abey-styles.js"`** in **`main.ts`** (or equivalent entry) | **`abey.json`** styles are bundled into that URL by **`abeyVitePlugin()`**. It is **not** injected automatically into built **`index.html`**; omitting the import ⇒ blank UI or stray **404/HTML parsed as JS** in prod. |
| **`abeyVitePlugin()`** with **`enforce: "pre"`** (default in the scaffold) | Ensures **`.view.html`** / **`.abey`** compile during **`vite build`**. Stripping **`enforce`** breaks the optimizer/scan path—see **`@abeyjs/compiler`** README troubleshooting. |
| **`import "@abeyjs/view/theme/omega-default.css"`** when you use **`bootstrapOmegaApp`** / shell chrome | Tokens and shell styles are separate from **`/abey-styles.js`**. |
| **`"experimentalDecorators": true`** in **`tsconfig.json`** (or rely on the plugin’s esbuild flag) | Lazy routes **`import()`** OM modules; decorators must lower or dynamic import fails (**`Unexpected token '@'`**). |

Static hosts that only upload **`dist/`** do not run Node; **`VITE_*`** URLs (API, OpenAPI in templates) must be correct **at build time** in CI—set them in the host’s env or in **`.env.production`**.

### SPA hosting (routing)

Your server or CDN must **serve `index.html` for unknown paths** used by **`createPathRouter` / History API**, while real files (**`/assets/*.js`**, **`favicon`**, **`mock-nav.json`**, …) resolve normally.

Examples:

- **Nginx:** `try_files $uri /index.html;` for the SPA location.
- **Netlify:** `/* /index.html 200` (or SPA preset).
- **`serve` SPA mode:** prefers a fallback to **`index.html`**.
- **GitHub Pages (project site)** is purely static—without server rewrites you need **`base`** plus pathname handling (see below), and either duplicate **`404.html`** from **`index.html`** or emit per-route **`index.html`** stubs. AbeyJs’s **docs web** uses **`vite-doc-spa-paths.ts`** for known routes (**[`docs/monorepo-desarrollo.md`](monorepo-desarrollo.md)**). Your product app can copy that pattern or rely on **`404.html`** plus client routing if an HTTP **404** on refresh is acceptable.

### Subpath deployments (`/` + repo or company prefix)

If the app is not at **`https://host/`** but at **`https://host/MyApp/`**, **Vite** and **`@abeyjs/view`** must agree:

1. **`vite.config.ts`:** set **`base`** to that prefix with a trailing slash, e.g. **`base: "/MyApp/"`**. Often from **`process.env` / CI** (case-sensitive slug must match the public URL).
2. **`bootstrapOmegaApp`** — pass **`shell.pathnameBase`** equal to **`import.meta.env.BASE_URL`** (same string Vite injects from **`base`**). The **`admin`** / **`empty`** template **`main`** omits **`pathnameBase`** when **`base`** is **`/`**; **add it whenever `base` is not `/`.**

The router (**`mountRoutedApp`**) uses that basename so **`pushState`** and sidebar **`href`** match the deployed URL (**`pathnameBase`** in **`@abeyjs/view`**).

### What this repo’s **docs site** deployment is

**[`docs/monorepo-desarrollo.md`](monorepo-desarrollo.md)** (*Publishing **`docs/web`** to GitHub Pages*) is **only** the **documentation SPA** inside this monorepo (workflow **`.github/workflows/docs-github-pages.yml`**, **`DOCS_SITE_BASE`**, **`vite-doc-spa-paths.ts`**). Product apps generated with **`abeyjs init`** follow **this Quick start** § plus your host’s SPA rules—they do **not** need that workflow unless you copy it for your own Pages deploy.
