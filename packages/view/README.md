# `@abeyjs/view`

AbeyJs **view layer**: native **DOM** bindings, routed **shells**, **`@AbeyComponent`** web components wired to **`OmegaRuntime`**, data-driven **list/form** mounting (form controls live in **`@abeyjs/uikit`**), declarative hero pages, **lazy** route factories, lightweight **signals**, DOM **dependency injection**, and **safe HTML** helpers.

No React/VDOM — **`StateCell`** + incremental updates, or compiler-generated **`mount`** from **`.view.html`** (pipeline in **`@abeyjs/compiler`**).

---

## Install

```bash
npm install @abeyjs/view
```

**Peers (your app supplies them):** **`vite`** (^5 or ^6) if you import **Vite-only** subpaths; **`zod`** (^3.24+).

**Runtime deps (bundled transitively via this package):** **`@abeyjs/core`**, **`@abeyjs/runtime`**, **`@abeyjs/state`**, **`@abeyjs/uikit`**, **`@abeyjs/validation`**.

---

## Package exports

| Subpath | Purpose |
|---------|---------|
| **`@abeyjs/view`** | Main API — **`src/index.ts`**. Routing, bootstrap, **`@AbeyComponent`**, mount helpers, safe HTML, etc. |
| **`@abeyjs/view/package.json`** | Resolvable package root (CLI **`require.resolve`** / wrappers). |
| **`@abeyjs/view/theme/omega-default.css`** | Default shell / layout CSS variables (static asset; import once in **`main`**). |

### Vite-only (Node / `vite.config`; not shipped in typical browser bundles)

| Subpath | Purpose |
|---------|---------|
| **`@abeyjs/view/dev/vite-logger`** | **`createAbeyViteLogger()`** — tags logs as **`[abey]`** instead of **`[vite]`** for skim-friendly dev output. |
| **`@abeyjs/view/dev/vite-malformed-uri-guard`** | **`abeyViteMalformedUriGuard({ locale? })`** — answers **400** for illegal **`%`** sequences **before** Vite’s static middleware throws (**`URI malformed`** noise). CLI templates enable this by default. |
| **`@abeyjs/view/dev/vite-docs-static-site`** | Static SPA hosting helpers (GitHub Pages–style **`base`** + **`dist/<path>/index.html`** duplicates). See [Vite: static docs / GitHub Pages](#vite-static-docs--github-pages) below. |
| **`@abeyjs/view/dev/sync-spa-html-fallback-paths`** | **`syncSpaHtmlFallbackPaths({ … })`** — writes a TS module listing route path strings from **`pageRoute` / `componentRoute`** sources via AST scanning. Use with a JSON config instead of bespoke scripts. |
| **`@abeyjs/view/dev/spa-fallback-paths-ast`** | Lower-level AST helpers used by **`sync-spa-html-fallback-paths`**; import only if you integrate custom tooling. |

### CLI (**`bin`**)

| Command | Purpose |
|---------|---------|
| **`abey-sync-spa-paths`** | **`abey-sync-spa-paths --config abey-spa-paths.config.json`** — generates the path list module (usually **`vite-doc-spa-paths.ts`**). Point **`package.json`** **`prebuild`** at this so CI never misses a route. |

---

## Vite: static docs / GitHub Pages

For an SPA deployed to a host **without SPA fallback** at the edge (classic **GitHub Pages**):

1. **Path list from source** — Run **`abey-sync-spa-paths`** against a small JSON config that lists TS files declaring **`navChildren`**, **`pageRoute`/`componentRoute`**, or **`getUtilsRoutes()`**–style literals. Output: **`export const DOC_SPA_HTML_FALLBACK_PATHS = ["/guides/foo", …] as const`**.
2. **Duplicate shell HTML after build** — In **`vite.config.ts`**, add **`abeyViteSpaHtmlFallbackDirs({ paths: DOC_SPA_HTML_FALLBACK_PATHS })`** from **`@abeyjs/view/dev/vite-docs-static-site`**. It runs in **`writeBundle`** and emits **`dist/<pathname>/index.html`** copies of the root **`index.html`** so deep links load the app shell.
3. **Subpath `base`** — **`abeyViteDeployBase()`** reads **`DOCS_SITE_BASE`** (for example **`/<RepoSlug>/`**) into Vite **`base`**.

Optional on the **same module**:

- **`resolveAbeyDocsCanonicalOrigin(mode, loadEnv(...), { devFallbackOrigin })`** — canonical URL (**no trailing slash**) for **`%DOC_SITE_ORIGIN%`** in **`index.html`**; required in **`production`** if env is empty.
- **`abeyViteCanonicalSitePlugin({ getOrigin, jsonLd: { siteName, description, inLanguage } })`** — replaces the placeholder + injects **WebSite** JSON-LD.

Reference implementation: monorepo **`docs/web`** (`vite.config.ts`, **`abey-spa-paths.config.json`**, **`docs/web/README.md`**).

---

## Bootstrap & shell

- **`bootstrapOmegaApp(root, config)`** (`bootstrap/omega-bootstrap.ts`) — Optional **auth** gaps for **public paths**, **`mountRoutedApp`**, **`resolveBootstrapRuntime(createOmega)`**, **`exposeBootstrapRuntime`**. Exposes **`globalThis.__abeyRuntime`** (and **`globalThis.__abeyDi.channel`** when absent) so **`abey-table`**, **`abey-widget`**, **`@AbeyComponent`** (default **`runtimepath` → **`__abeyRuntime`**), and **`getBootstrapRuntime()`** work without per-app glue. **`registerAbeyJsUi()`** remains explicit (defines **`abey-*`** elements). Router publishes **`omega/nav:changed`** on navigation (**`source: abey-router`**).

- **`mountRoutedApp` / `mountAppShell`** — Admin / landing / **blank** shell, sidebar + **`main.abey-outlet`**, **`PathRouter`** with **`history`**. Admin (**`variant: "admin"`**) defaults to dark chrome (**`appearance: "dark"`**); use **`appearance: "light"`** or the app-bar toggle; **`ABEY_SHELL_APPEARANCE_STORAGE_KEY`** + **`persistAppearance`** (**default `true`**) persists theme.

- **`createPathRouter`**, **`normalizePathname`** — Coordinate with **`setPath`** from **`@abeyjs/runtime`** for intent-aligned URLs.

---

## Routing primitives

**`AppRoute`** (`shell/app-routes.ts`) — path, **`mount(outlet)`**, nav metadata.

- **`pageRoute`** + **`buildPageView` / `createPageViewElement`** — Declarative **`PageViewSpec`** pages (**`PageRouteNav`**).
- **`componentRoute`** — **`ComponentRouteNav`** + **`ComponentRouteSpec`**; use **`satisfies`** on **`routes.ts`** for literal path types.
- **`lazyViewMount(importFn, exportName)`** — **`import()`** + loading affordance; teardown forwards inner **`dispose`**.

**`firstNavPath`**, **`matchAppRoute`** — Table-driven matching.

Optional **`navChildren`** (**`AppRouteNavChild[]`**, recursive **`children`**) — Sidebar groups; **every leaf path** must still exist on a concrete **`AppRoute`** so **`matchAppRoute`** resolves the view.

**Pathname deploy base** (**`import.meta.env.BASE_URL`** / Vite **`base`**): **`hrefUnderPathnameBase`**, **`pathIsUnderPathnameBase`**, **`rewriteRootAbsoluteAnchorsForPathnameBase`**, **`installPathnameBaseAnchorClickGuard`** (`router/pathname-base-nav.ts`) fix **`<a href="/…">`** and in-app navigations under **`/<repo>/`**.

Sidebars from HTTP: **`fetchSidebarNav`**, **`buildRoutesFromApi`** (`shell/nav-from-api.ts`).

---

## `@AbeyComponent` & OM templates

- **`AbeyComponent`**, **`defineAbeyComponent`**, **`AbeyComponentElement`** — **`template`**, optional **`stylesHrefs`** (**`<link>`** URLs: Vite **`?url`** / **`new URL(..., import.meta.url)`**), optional **`stylesText`** (e.g. **`import sheet from "./x.css?inline"`** into shadow **`style`**). Do **not** put **`?inline`** blobs in **`stylesHrefs`** (**`URI malformed`** / bad requests). Reactive **`state`** drives **`bindAbeyTemplate`**.

- **`componentRoute`** + **`load()`** leaves outlet empty unless **`showLoading: true`** (shows localized loading chrome during chunk fetch).

- **`mountModuleStyles`**, **`withModuleStyles`** — Co-located CSS for OM modules.

- **`AbeyJsViewElement`** / **`registerAbeyJsView`** — Older **`{{path}}`** interpolation + **`abeyjs-for`**. Prefer the compiler OM path for shipped screens.

- **`registerAbeyJsUi()`** — Registers **`abey-*`** from **`@abeyjs/uikit`**, **`abey-widget`**, **`abey-provide`**. Run once early in **`main.ts`**.

- **`defineAbeyUxView`** — UX-shell composition API (**`define-abey-ux-view.ts`**).

---

## Data-driven views (`view-types.ts`)

Types **`ListViewDef`**, **`ListSlice`**, **`FormViewDef`**, **`FormSlice`**, **`ViewField`**, etc.

Mount helpers (`dom/`):

- **`mountFormView`**, **`createOmegaFormSurface`**, **`mountIntentButton`** — Thin forwards to **`@abeyjs/uikit`** (same ergonomics).

- **`mountListView`**, **`mountListViewSync`**, **`mountSignalList`** — Tables/lists on **`StateCell`** slices.

- **`mountBoundText`**, textual templates.

- **`bindActions`**, **`bindAbeyTemplate`** — Delegated intents / OM partials.

- **`mountInterpolatedTemplate`**, **`mountReactiveTemplate`**, **`createTemplateView`** — String/HTML shells with reactive holes.

- **`mountTracePanel`** — Dev HTTP/event strip (**`OmegaRuntime`**).

- **`mountLifecycle`** — **`onDestroy`**-style wrapping.

**`blocks-screen.ts`** — **`screen`**, **`mountScreenView`**, **`dataTable`**, toolbar **search/select**, etc.

---

## DI (`di/`)

**`inject` / `tryInject`** — Sync token reads from runtime container.

**`injectFromDom` / `tryInjectFromDom`**, **`AbeyProvideElement`**, **`AbeyUxViewMeta.providers`** — DOM-scoped wiring for **`@AbeyComponent`**. Tokens: **`dom-di-tokens`** (**`DOM_CHANNEL_TOKEN`**, etc.).

---

## State (`state/signal.ts`)

Small **signal** API (**`signal`**, **`computed`**, **`readonlySignal`**) alongside **`StateCell`** — for fine-grained dependency edges.

**`applyViewTheme`**, **`ABEYJS_VIEW_BASE_CLASS`** (**`view-theme.ts`**) — Shared theme hints for OM surfaces.

---

## Security

Never assign raw API/HTML strings to **`innerHTML`** for untrusted data. Prefer **`textContent`** or **`setSanitizedHtml`**, **`configureSanitize`**, **`AbeyJs.sanitize`** (**`safe-html.ts`**).

Product-oriented write-up (Spanish/English mix in upstream repo): **`docs/security-omegax.md`** at monorepo root.

---

## Build (maintainers)

```bash
npm run build -w @abeyjs/view
```

Produces **`dist/`** + declaration files consumed by **`exports`** map in **`package.json`**.
