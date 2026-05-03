# AbeyJs vision — product contract

Baseline for **what we want AbeyJs to be** vs code already in the monorepo: where you can rely safely and where you still assemble yourself. Not marketing—the map we use to prioritize issues and releases.

---

## 0. Why AbeyJs vs repetitive CRUD

Classic flow: per entity you rebuild table, form, validation, async state, DTO wiring—each line risks **drift** with the backend.

**Project bet:** if the backend ships reliable **OpenAPI**, the client can **discover** collection/item pairs and mount **list + form + intents** on a reactive agent (`@abeyjs/openapi`). “Manual mode” still exists: ignore it and hand-build DOM; the **differentiator** is productive work with **one source of truth: the spec**.

Keep these files handy when discussing with the team:

- `packages/openapi/src/register.ts` — agent + intent registration.
- `packages/openapi/src/discover-crud.ts` — path heuristics.
- End-to-end example: `examples/crud-app` folder.

Feature checklist (table 1–15) and status **in code today**: **`/guides/crud-auto`** (same as `docs/crud-automatico-omegax.md` in the repo).

---

## 1. Requirement ↔ implementation matrix

| Requirement | Coverage today | Where to look |
| --- | --- | --- |
| Reactive model (UI from data) | Yes — observable cells | `@abeyjs/core` (`StateCell` and related). |
| Optional global “no manual state” | Partial — you decide view vs agent split | App architecture. |
| Granular table reactivity | Yes — RAF batching, per-row merge | `mountListViewSync`, `packages/view/src/dom/mount-list-sync.ts`. |
| Automatic CRUD from OpenAPI | Partial → grows with spec | `@abeyjs/openapi`; collection routes + `/{id}` typically. |
| Types from OpenAPI | Yes — `abeyjs codegen` | `@abeyjs/cli`. |
| Client validation (Zod) | Yes | `@abeyjs/validation`; inferred/generated schemas. |
| Server validation | Outside framework | Your stack (.NET, Node, etc.). |
| Generic REST | Yes — `OmegaHttp` | `@abeyjs/http`, `createOmegaHttp`. |
| List/form agent loading/error | Yes — OpenAPI agent view slices | Registered agent code. |
| “Low boilerplate UI” mode | Partial | `mount*View` helpers; single public zero-line CRUD screen TBD if we want it. |
| Manual DOM + defs hybrids | Yes — custom `mount` + partial `mountListView*` | `AppRoute.mount`. |
| Full DOM control | Yes — primitives optional | Any HTML/TS. |
| Runtime plugins | Yes — explicit teardown | `OmegaRuntime.registerPlugin` (`@abeyjs/core`). |
| Keyed table engine | Yes | `rowKey`, `mergeListRowsByKey`. |
| XSS-safe defaults | Yes — see **`/guides/security`**. |
| CRM/ERP operational scale | Product/ops | Pagination, caching, etc.—not all in core. |

**Discovery gap we closed:** discovery used to be rigid without `/{id}` on items; specs can define item paths and get/put/patch/delete so the agent completes update/delete when appropriate.

---

## 2. HTML: safe by default, explicit risk

Full normative rules: **`/guides/security`**. Operational summary:

- Happy path: `textContent`, escaped `{{ }}` bindings, no magic `innerHTML` from data.
- Rich HTML: `setSanitizedHtml` + policy (`configureSanitize`, e.g. DOMPurify).
- Advanced: your `innerHTML` → **100% your responsibility**.

---

## 3. CSS: AbeyJS default theme coexistence

- Standard entry: `import "@abeyjs/view/theme/omega-default.css"` — `--abey-*` vars, BEM `abey-` prefix.
- Your CSS (Tailwind, modules, …) lives by import order and specificity.
- Customize: container tokens → targeted overrides → replace layout blocks keeping primitives.
- Light/dark: admin shell integrates toggle + persistence; you can force initial appearance and `themeVars*` from JS (see **`/guides/bootstrap-shell`**).

---

## 4. OpenAPI registration — APIs we rely on

- **`registerOpenApiCrud`:** one discovery → one agent; `…/List`, `…/Create` and, when spec allows, `…/Update`, `…/Delete`.
- **`registerWithDiscovered`:** after you filtered a `DiscoveredCrud`.
- **`registerOpenApiAllCrud`:** multi-entity sweep; `entityPascal` composes path segments to reduce collisions (e.g. `/api/products` → `ApiProducts`).
- HTTP alignment: `putJson`, `patchJson`, `deletePath` in `packages/http/src/client.ts`.

---

## 5. Plugins

`runtime.registerPlugin({ id, install })` — `install` returns optional teardown; runtime `disposeAll` runs them. No component tree required—hook `channel` or `onIntent` alone.

---

## 6. Packages (summary)

| Package | Role |
| --- | --- |
| `@abeyjs/core` | Intents, runtime base, `StateCell`, plugins. |
| `@abeyjs/view` | Shell, routes, lists/forms, OM host. |
| `@abeyjs/http` | Traceable client. |
| `@abeyjs/validation` | Zod + per-field errors. |
| `@abeyjs/openapi` | Discovery + CRUD agent. |
| `@abeyjs/cli` | Init, connect, codegen, generators. |

Ready examples: monorepo `examples/` folder.

Next on the web: **`/guides/abey-templates`** or **`/guides/crud-auto`** depending on OM syntax vs OpenAPI pipeline.
