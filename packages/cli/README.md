# `@abeyjs/cli`

**`abeyjs`** — scaffolding, OpenAPI **connect**/**codegen**, patches to existing Vite apps, and **Omega** vertical-slice generators.

Runtime behaviour (CRUD agents, HTTP, mounted views) stays in **`@abeyjs/openapi`**, **`@abeyjs/http`**, **`@abeyjs/view`**; this package is the **tooling** you run in CI or locally.

**Binary:** **`abeyjs`** (`package.json` → `"bin"` → `dist/cli.js`).

**Peer:** **`typescript`** `>=5` (for codegen that shells to project TS / expectations in templates).

---

## Install & run

```bash
# latest global
npm i -g @abeyjs/cli

# project devDependency (npx)
npm i -D @abeyjs/cli
npx abeyjs --help
```

```bash
# from monorepo source (maintainers)
npm run build -w @abeyjs/cli
node packages/cli/dist/cli.js help
```

---

## Command map

| Command | Role |
|---------|------|
| **`abeyjs new` / `create` / `init`** | Copy a Vite + TS template into `<folder>`. |
| **`abeyjs add openapi`** | Patch an existing app (`package.json`, **`vite.config`** proxy, stubs) — no prior **`connect`**. |
| **`abeyjs connect`** | Fetch OpenAPI → **`.abeyjs/connect.json`** + **`abeyjs.connect.yml`** for **`generate views`**. |
| **`abeyjs generate views`** | OM/TS scaffolding from **`connect.json`**. |
| **`abeyjs generate ecosystem`** (`g ecosystem`) | Sample vertical slice (intent → agent → flow → UI). |
| **`abeyjs codegen`** | **`openapi-typescript`** + **`omegaSetup.generated.ts`** stubs (typed paths only; not full CRUD UI). |
| **`abeyjs help`**, **`abeyjs version`**, **`abeyjs -v`** / **`--version`** | Usage text; full env report vs semver only. |

Long-form prose for flags and workflows: **`docs/cli-reference.md`** (monorepo root).

---

## `abeyjs new | create | init <folder>`

Copies **`packages/cli/templates/`** (or codegen for **`minimal`**) into **`<folder>`**.

| Flag | Values | Notes |
|------|--------|-------|
| **`--template`** | **`admin`**, **`empty`**, **`abeyjs`**, **`minimal`** | **`minimal`** = tiny **`@abeyjs/core`**-only skeleton (no template dir). **`empty`** / **`abeyjs`** use the **`empty`** template layout. |
| **`--shell`** | **`dashboard`**, **`appbar`** | Only **`--template admin`**. |
| **`--skip-install`** | — | Skip **`npm install`** after scaffold. Same as env **`SKIP_ABEYJS_SCAFFOLD_INSTALL=1`**. |

Default: runs **`npm install`** in the new folder.

**Production deploy** (SPA **`base`**, shell **`pathnameBase`**, styles bundle): **`docs/quick-start.md`** → *Deploy your app (production)*.

---

## `abeyjs add openapi <folder>`

Patches **`package.json`** (adds **`@abeyjs/openapi`**, **`@abeyjs/http`**), **`vite.config.ts`** (**`^/api`**, **`/swagger`** proxy, comment **`abeyjs-openapi-proxy`**), **`.env.example`**, optional **`omegaSetup` / `/crud-api`** stubs (marker **`ABEYJS-OPENAPI-WIRE`** avoids duplicates).

| Flag | Default |
|------|---------|
| **`--proxy`** | `https://127.0.0.1:7019` |
| **`--openapi-path`** | `/swagger/v1/swagger.json` |
| **`--skip-install`** | — |

See **`packages/openapi/README.md`** for **`mountOpenApiCrudView`**, **`discover*`**, **`registerOpenApi*`**.

---

## `abeyjs connect <swagger-url> [--target <dir>] [--insecure]`

Produces design-time artefacts:

| File | Contents |
|------|-----------|
| **`.abeyjs/connect.json`** | **`ConnectContract`** — source URL, **`entities[]`**, CRUD-ish endpoints, pagination hints (**`openapi-config.writeConnectContract`**). |
| **`abeyjs.connect.yml`** | Human-editable overrides (**`openapi-config.ensureYamlConfig`**). |

Loads URL via **`fetch`** or local JSON. **`--insecure`** temporarily relaxes TLS for **`fetch`** (restored in **`finally`**).

**TTY:** per-entity **`crud` | `action` | `service` | `skip`**.

Internals: **`src/openapi-connect.ts`**, **`src/openapi-contract.ts`** (**`buildConnectContract`**).

---

## `abeyjs generate views [--target <dir>] [--scaffold minimal|full]`

Reads **`.abeyjs/connect.json`** (+ YAML). **`full`** emits extra layering (**`src/app`**, **`src/ui`**, etc.). Requires a prior successful **`connect`**.

Implementation: **`src/openapi-generate-views.ts`**.

---

## `abeyjs generate ecosystem <Name> [--feature-root <path>] [--target <dir>] [--show-nav|--no-show-nav]`

Emits **`omega/`** semantics, behaviour, agent, flow, **`register.ts`**; **`ui/app.<kebab>.*`** OM views; stubs **`model/`**, **`data/`**; best-effort patches **`omegaSetup.ts`** and **`routes.ts`**.

| Flag | Notes |
|------|-------|
| **`--target`** | App root (**`src/`** must exist). **`INIT_CWD`** / cwd resolution applies. |
| **`--feature-root`** | Relative (or absolute) feature parent; stays under **`src/`**. Default **`src/<kebab>`** or cwd-relative when run inside **`src/foo`**. |
| **`--show-nav` / `--no-show-nav`** | **`--hide-nav`** ≡ **`--no-show-nav`**. Non-interactive default: visible nav. |

Details: **`src/generate-ecosystem.ts`** (`runGenerateEcosystem`, …).

---

## `abeyjs codegen <spec.json|yaml> -o|--out <dir>`

Runs **`openapi-typescript`** and writes **`omegaSetup.generated.ts`** path hints — **independent** of **`connect`** / **`generate views`**.

---

## Environment & npm oddities

- **`npm_config_target`**, **`npm_config_proxy`**, **`npm_config_openapi_path`**: honoured when npm passes flags into scripts.
- **`INIT_CWD`**: aligns relative paths with how **`npm`** runs workspaces.
- **Install banners** (`preinstall` / `postinstall`): **`SKIP_ABEYJS_INSTALL_MSG=1`** or **`CI=true`** silence them.

---

## Templates (`packages/cli/templates/`)

Source trees for **`admin`**, **`empty`**. **`templates/README.md`** in this package explains layout / shell patching.

---

## Related packages (not this CLI)

| Package | Responsibility |
|---------|----------------|
| **`@abeyjs/openapi`** | Runtime CRUD discovery, **`mountOpenApiCrudView`**. |
| **`@abeyjs/view`** | **`bootstrapOmegaApp`**, **`registerAbeyJsUi()`**, routed shell. |
| **`@abeyjs/compiler`** | **`abeyVitePlugin`** in generated **`vite.config`**. |

---

## Build

```bash
npm run build -w @abeyjs/cli
```
