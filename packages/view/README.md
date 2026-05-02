# `@abeyjs/view`

AbeyJs **view layer**: native **DOM** bindings, routed **shells**, **`@AbeyComponent`** web components wired to **`OmegaRuntime`**, data-driven **list/form** mounting (delegating form implementation to **`@abeyjs/uikit`**), declarative hero pages, **lazy** route factories, lightweight **signals**, DOM **dependency injection**, and **safe HTML** helpers.

No React/other VDOM dependency — **`StateCell`** + incremental updates or compiler-generated **`mount`** from **`.view.html`** (see **`@abeyjs/compiler`**).

---

## Package exports

| Path | Purpose |
|------|---------|
| **`@abeyjs/view`** | Main barrel — see **`src/index.ts`**. |
| **`@abeyjs/view/dev/vite-logger`** | Dev-only Vite instrumentation (not bundled in typical app chunks). |
| **`@abeyjs/view/theme/omega-default.css`** | Default shell / layout tokens (**static** asset). |

**Peer:** **`zod`** (schemas for form surfaces re-exported from **`@abeyjs/uikit`**).

**Depends on:** **`@abeyjs/core`**, **`@abeyjs/runtime`**, **`@abeyjs/state`**, **`@abeyjs/uikit`**, **`@abeyjs/validation`**.

---

## Bootstrap & shell

 **`bootstrapOmegaApp(root, config)`** (`bootstrap/omega-bootstrap.ts`) — optional **auth** branch for **public paths**, then **`mountRoutedApp`** + resolves **`OmegaRuntime`** from **`createOmega`**. Publishes **`omega/nav:changed`** on navigation (**`source: abey-router`**). Apps should import **`@abeyjs/view/theme/omega-default.css`** (not auto-injected).

 **`mountRoutedApp`** / **`mountAppShell`** — admin / landing / **blank** variants, sidebar + **`main.abey-outlet`**, **`PathRouter`** via **`history`**. Admin (**`variant: "admin"`**) defaults to **dark** chrome (**`appearance`** **`"dark"`**); use **`appearance: "light"`** for claro inicial, ☀️/🌙 in the app bar to toggle, **`ABEY_SHELL_APPEARANCE_STORAGE_KEY`** (**`persistAppearance`** default **`true`**) persists choice.

 **`createPathRouter`**, **`normalizePathname`** — align with **`setPath`** from **`@abeyjs/runtime`** for intent-first URL sync.

---

## Routing primitives

 **`AppRoute`** (**`shell/app-routes`**) — path, **`mount(outlet)`**, nav metadata. Helpers:

- **`pageRoute`** + **`buildPageView` / `createPageViewElement`** — declarative **`PageViewSpec`** pages (nav: **`PageRouteNav`**).
- **`componentRoute`** — **`ComponentRouteNav`** + **`ComponentRouteSpec`** (**`component-route.ts`**); use **`satisfies`** in app **`routes.ts`** for strict literals.
- **`lazyViewMount(importFn, exportName)`** — dynamic **`import()`** + spinner; teardown returns inner **`dispose`** when exposed.

 **`firstNavPath`**, **`matchAppRoute`** — table-driven matching.

- Optional **`navChildren`** (**`AppRouteNavChild[]`**, recursive **`children`**) — admin sidebar renders nested groups (**`<details>`**); every leaf **`path`** must still appear on a top-level **`AppRoute`** so **`matchAppRoute`** resolves the view.

---

## `@AbeyComponent` & OM templates

 **`AbeyComponent`**, **`defineAbeyComponent`**, **`AbeyComponentElement`** — custom elements with **`template`**, optional **`stylesHrefs`** (async **`<link>`**), optional **`stylesText`** (raw CSS, e.g. Vite **`import sheet from "./x.css?inline"`** → **open Shadow DOM** + **`<style>`**, styles ship in the same chunk as the component), DOM-DI **`providers`**, **`runtimepath`**. Reactive **`state`** drives **`bindAbeyTemplate`**.

 **`componentRoute`** with **`load()`** leaves the outlet empty by default; set **`showLoading: true`** to show “Cargando…” while the chunk loads.

Companion: **`mountModuleStyles`**, **`withModuleStyles`**.

 **`AbeyJsViewElement`** / **`registerAbeyJsView`** — legacy/simple **`{{path}}`** text interpolation + **`abeyjs-for`** (see **`abeyjs-view-element.ts`**). Prefer compiler pipeline for production OM screens.

 **`registerAbeyJsUi()`** — one-shot registry for **`abey-*`** primitives from **`@abeyjs/uikit`** + **`abey-widget`**, **`abey-provide`**. Call **`main.ts`** before routes.

 **`defineAbeyUxView`** — UX-shell wrapper API (**`define-abey-ux-view.ts`**).

---

## Data-driven views (**`view-types.ts`**)

Re-exports **`FormViewDef`**, **`FormSlice`**, **`ViewField`** (from **`@abeyjs/uikit`**). **`ListViewDef`**, **`ListSlice`** live here — list schema for **`mountListView`** / **`mountListViewSync`**.

Mount helpers (**`dom/`**):

- **`mountFormView`**, **`createOmegaFormSurface`**, **`mountIntentButton`** — thin re-exports to **`@abeyjs/uikit`** (same signatures).
- **`mountListView`**, **`mountListViewSync`**, **`mountSignalList`** — reactive tables bound to **`StateCell`** slices.
- **`mountBoundText`**, **`mountText`** — textual binding.
- **`bindActions`**, **`bindAbeyTemplate`** — delegated clicks / OM partials.
- **`mountInterpolatedTemplate`**, **`mountReactiveTemplate`**, **`createTemplateView`** — string/HTML templates with reactive holes.
- **`mountTracePanel`** — dev-oriented HTTP/event trace strip (**`OmegaRuntime`**).
- **`mountLifecycle`** — attach **`onDestroy`** style hooks around mount functions.

 **`blocks-screen.ts`** — screen builder primitives (**`screen`**, **`mountScreenView`**, **`dataTable`**, toolbar **search/select**, …).

---

## DI (**`di/`**)

 **`inject` / `tryInject`** — synchronous token resolution (runtime container).

 **`injectFromDom` / `tryInjectFromDom`**, **`AbeyProvideElement`**, **`AbeyUxViewMeta` providers`** — stash providers in DOM for **`AbeyComponent`** trees. Tokens: **`dom-di-tokens`** (**`DOM_CHANNEL_TOKEN`**, etc.).

---

## State (**`state/signal.ts`**)

Tiny **signal** primitives (**`signal`**, **`computed`**, **`readonlySignal`**) distinct from **`StateCell`** — used where fine-grained graph is desired.

 **`applyViewTheme`**, **`ABEYJS_VIEW_BASE_CLASS`** (**`view-theme.ts`**) — shared theme hooks for OM surfaces.

---

## Security

When turning **untrusted strings** into HTML, use **`setSanitizedHtml`**, **`configureSanitize`**, **`AbeyJs.sanitize`** (**`safe-html.ts`**). See **`docs/security-abeyjs.md`** in this repo.

---

## Build

```bash
npm run build -w @abeyjs/view
```
