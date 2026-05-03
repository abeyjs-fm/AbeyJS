# Introduction to AbeyJs

AbeyJs is the stack we built for SPAs with a **real DOM**, **`OmegaRuntime`** (AbeyJS runtime), and **intents** as the backbone. There is no central VDOM: the compiler turns your **`.view.html`** into elements and the binder updates only what changes. Coming from React or Vue, think *web components + message contract + product shell*, not another diffing runtime.

## Why it exists

We got tired of hand-duplicating CRUD, menus, and state when the backend already exposes **OpenAPI** and the browser can honor typed contracts. AbeyJs brings together:

- **Shell** with routes, sidebar, and outlet ready for dashboards (`@abeyjs/view`).
- **OM** (AbeyJs markup): HTML with `{{ }}`, `[prop]`, `(click)` and `@if` / `@for` blocks, compiled by Vite (`@abeyjs/compiler`).
- **Channel + intents**: the UI does not “call services” everywhere; it dispatches typed intents and agents/flows respond (`@abeyjs/core`, `@abeyjs/runtime`, and optionally `@abeyjs/agents` / `@abeyjs/flows`).

The extended product vision and CRUD/OpenAPI map live under **`/guides/vision`** and **`/guides/crud-auto`**; here we only state the technical map.

## What it solves (mental checklist)

| Layer | What you get |
|------|---------|
| Navigation | Flat `AppRoute[]`, `matchAppRoute`, History API; menu optionally merged from JSON/API (`fetchSidebarNav`, `buildRoutesFromApi`). |
| Screen views | `@AbeyComponent` or `mount()` straight from compiled template. |
| Data → UI | `mountListView` / `mountListViewSync`, `mountFormView`, defs built on `ViewField`; optional OpenAPI (`@abeyjs/openapi`). |
| Tooling | `abeyjs` CLI for init, Swagger connect, codegen, ecosystems. |

## What it deliberately is *not*

- Not React Hooks rebranded: **no** Fiber or global virtual-tree reconciler.
- **SSR** can be layered on top, but **not** shipped as an “official SSR story” in core today.
- The **DSL** like `model X / view auto` shown in some vision sketches as a *future meta-language* **is not** supported syntax—the practical path is OpenAPI + TS registration.

## Monorepo packages (quick reference)

| Package | Role |
|---------|-----|
| `@abeyjs/core` | `intentOf`, intent models, minimal plugin API, runtime building blocks. |
| `@abeyjs/runtime` | `OmegaRuntime`, `dispatch`, stable pub/sub channel. |
| `@abeyjs/state` | Reactive cells (**`StateCell`**, etc.) used by views and agents. |
| `@abeyjs/view` | Shell, routes, `@AbeyComponent`, lists/forms, default HTML safety, AbeyJS default theme (`omega-default.css`). |
| `@abeyjs/compiler` | `abeyVitePlugin()`, `compileAbeyToTs` pipeline. |
| `@abeyjs/cli` | Scaffolding and generators (init, openapi, codegen, ecosystem). |
| `@abeyjs/http` | HTTP client with traces aligned to the channel (e.g. `createOmegaHttp`). |
| `@abeyjs/openapi` | CRUD discovery from spec, dynamic agents. |
| `@abeyjs/validation` | Zod and field-error helpers. |
| `@abeyjs/uikit` | `abey-form`, `abey-table`, form-model decorators. |
| `@abeyjs/agents` / `@abeyjs/flows` | Optional orchestration pieces (the CLI can scaffold an example slice). |

## When AbeyJs fits—and when it does not

**It fits** when you want end-to-end TypeScript, custom elements as UI units, admin/operations apps where **OpenAPI** or Zod defs can feed lists/forms, and one place for **navigation analytics** (`omega/nav:changed`). **Look elsewhere** if the team wants JSX with a mature React-only ecosystem, or an SSR-first framework with batteries included on day zero without touching the server.

## From template to runtime (single linear chain)

OM HTML writes nodes → the component or screen updates **`state`** / signals → if needed, **`dispatch(intentOf(...))`** → a registrar (**`omegaSetup`** or plugin) handles it → publishes events on the **channel** → the view (or another layer) subscribes and repaints only the bound parts.

## Glossary (terms used across this docs site)

| Term | Meaning in AbeyJs |
|---------|---------------------|
| **OM** | Markup compiled from **`.view.html`** / **`.abey`**; bindings and structural blocks. |
| **Outlet** | `main.abey-outlet` inside the shell: **`route.mount`** leaves your screen there. |
| **Intent** | Nominal message (`type` + payload) crossing UI and logic without stray callbacks. |
| **`AppRoute`** | Row in the flat routes table: `path`, `mount(outlet)`, `label`/`navChildren`/FA icons. |

## Suggested reading order

If you are opening the docs site cold, follow **`/guides/quick-start`** → **`/guides/bootstrap-shell`** → **`/guides/routing`** → **`/guides/abey-component`**. The **`/guides/runtime`** chapter and CLI can slot in after you have a compiling screen; **`/guides/vision`**, OpenAPI, and tables assume that map is clear.

Next: **`/guides/quick-start`**.
