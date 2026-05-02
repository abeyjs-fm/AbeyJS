# `@abeyjs/cli`

Command-line entry point for **scaffolding**, **OpenAPI wiring**, and **code generation** around AbeyJs apps. The published binary is `abeyjs` (see `package.json` `"bin"`).

---

## Commands

### `abeyjs new | create | init <folder>`

Copies a Vite + TypeScript starter into `<folder>`.

| Flag | Values | Notes |
|------|--------|--------|
| `--template` | `admin`, `abeyjs`, `minimal` | `minimal` is a tiny package skeleton with only `@abeyjs/core`. |
| `--shell` | `dashboard`, `appbar` | Applies only to `--template admin`. |

Does **not** run `npm install`.

### `abeyjs add openapi <folder>`

Patches an existing AbeyJs + Vite app **without** requiring a prior `connect`. Implementation: **`src/openapi-add-wires.ts`** (`addOpenapiToApp`).

| Addition | Purpose |
|----------|---------|
| `package.json` | Adds **`@abeyjs/openapi`**, **`@abeyjs/http`** dependencies. |
| `vite.config.ts` | Proxies **`^/api`** and **`/swagger`** to **`--proxy`** (`changeOrigin`, `secure: false`), tagged comment `abeyjs-openapi-proxy`. |
| `.env.example` | Hint variables for proxy / API base (`ABEYJS_*` conventions used by templates). |
| **`omegaSetup` / routes** | Stubs **`initOpenApi`** / **`/crud-api`** when missing (marker **`ABEYJS-OPENAPI-WIRE`** avoids duplicate edits). |

| Flag | Default |
|------|---------|
| `--proxy` | `https://127.0.0.1:7019` |
| `--openapi-path` | `/swagger/v1/swagger.json` |

Runtime CRUD wiring still uses **`@abeyjs/openapi`** (`discover*` / `registerOpenApi*` / **`mountOpenApiCrudView`**) — see **`packages/openapi/README.md`**.

### `abeyjs connect <swagger-url> [--target <dir>] [--insecure]`

Produces the **design-time contract** consumed by **`abeyjs generate views`**. Implementation: **`src/openapi-connect.ts`** (`runConnect`).

| Artifact | Contents |
|----------|----------|
| **`.abeyjs/connect.json`** | **`ConnectContract`** — version stamp, **`source`** (`swaggerUrl`, **`fetchedAt`** ISO), **`entities[]`** with models, **`CrudEndpoints`**, pagination hints (**`openapi-config.writeConnectContract`**). |
| **`abeyjs.connect.yml`** | Parallel **YAML** tuned for codegen: widgets, combo **`options.endpoint`**, per-entity route/menu labels (**`openapi-config.ensureYamlConfig`**). |

Loads spec via **`fetch`** (URLs) or **`readFile`** + **`JSON.parse`** (paths). **`--insecure`** only affects HTTPS fetches (`NODE_TLS_REJECT_UNAUTHORIZED` rollback in **`finally`**).

Interactive **TTY**: prompts **`crud` | `action` | `service` | `skip`** per entity (**`askEntityTypes`**).

**Discovery & types:** **`src/openapi-contract.ts`** — **`buildConnectContract`**, **`EntityContract`**, **`ConnectContract`**, heuristic pagination inference from query params / response envelopes.

### `abeyjs generate views [--target <dir>] [--scaffold minimal|full]`

Reads **`.abeyjs/connect.json`** (+ YAML overrides) and materializes OM / TS scaffolding. **`--scaffold full`** emits extra slices (`src/app`, `src/ui`, use cases, …). Logic: **`src/openapi-generate-views.ts`** (**`runGenerateViewsWithOptions`**, **`listCrudCandidates`**).

Requires a successful **`connect`** (`connect.json` present with entities).

### `abeyjs generate ecosystem <Name> [--feature-root <path>] [--target <dir>]`

Creates a **vertical slice** (feature folder) with a working sample: tick intent → agent → flow → channel event → UI update.

| Flag | Purpose |
|------|---------|
| `--target` | App root (must contain `src/`). Defaults to `.`; resolved with the same rules as other commands (`INIT_CWD`, etc.). |
| `--feature-root` | Where to create the folder (relative to `--target` unless absolute). Default: `src/<kebab>` or, if you ran the CLI **from inside** `src/foo`, `src/foo/<kebab>`. Must stay under `src/`. |

**Emitted tree** (implementation: `src/generate-ecosystem.ts`):

| Path | Role |
|------|------|
| `omega/semantics.ts` | Intent names, agent/flow ids, `omega/ecosystem/<kebab>/…` event strings. |
| `omega/behavior.ts` | Starter rule mapping `Tick` intent → agent reaction. |
| `omega/agent.ts` | Stateful agent; ticks increment `viewState` and publish `eventTicked`. |
| `omega/flow.ts` | Listens for tick intent and `eventTicked`, emits UI expressions. |
| `omega/register.ts` | **`install<Name>Omega(runtime)`** — registers agent, flow, `onIntent` → `handleIntent`. |
| `ui/app-<kebab>.ts` | `@AbeyComponent` with `template` from **`?raw`** view + styles `?url`; dispatches tick intent. |
| `ui/app-<kebab>.view.html` | Tiny template with `(click)` binding. |
| `<kebab>.css` | Scoped layout for the section. |
| `model/`, `data/` | Empty stubs for DTOs and data access. |

**Auto-wiring** (best effort, only if files exist):

1. **`omegaSetup.ts`** (`src/` or project root): inserts `import { install… }` and `install…(runtime)` after `registerModule(registerCommon)`, else after `createOmegaRuntime()`, else before `return { runtime }`.
2. **`routes.ts`**: inserts `componentRoute('/<kebab>', …)` importing `ui/app-<kebab>.ts` **before** the 404 `pageRoute`, and adds `componentRoute` import from `@abeyjs/view` when needed.

Generated UI uses **`?raw`** HTML, not the OM template compiler pipeline.

Full behaviour, option types, and JSDoc live in **`src/generate-ecosystem.ts`** (`runGenerateEcosystem`, `normalizeEcosystemPascal`, `buildEcosystemWireInstructions`).

```bash
cd my-app
node packages/cli/dist/cli.js generate ecosystem Billing --target .
# from inside src/features (default folder becomes src/features/<kebab>):
cd src/features && node ../../../packages/cli/dist/cli.js generate ecosystem Reports --target ../..
```

---

### `abeyjs codegen <spec.json|yaml> -o <dir>`

Runs **`openapi-typescript`** into **`--out`** and writes **`omegaSetup.generated.ts`** stubs with path hints. Independent of **`connect`** / **`generate views`** (typed **`paths`** only, no CRUD UI).

### `abeyjs help`

Prints built-in usage text.

---

## Environment quirks

- **`npm_config_target`**, **`npm_config_proxy`**, **`npm_config_openapi_path`**: respected when npm passes config through scripts.
- **`INIT_CWD`**: used to resolve relative paths the same way npm scripts would from a workspace root.

---

## Templates

**`packages/cli/templates/`** contains **`admin`** and **`AbeyJs`** (note capital **O** folder name). **`minimal`** is generated in code — no template directory.

Layout, shell flags, and post-copy patches: **`templates/README.md`** in this package.

After **`abeyjs new`**, the CLI may adjust **`package.json` `name`**, emit root **`README.txt`**, and (**`admin` + `--shell appbar`**) flip **`dashboardLayout`** in **`src/main.ts`**.

---

## Build

```bash
npm run build -w @abeyjs/cli
```

Run the compiled CLI:

```bash
node packages/cli/dist/cli.js help
```
