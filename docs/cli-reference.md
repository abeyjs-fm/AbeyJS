# `abeyjs` CLI — maintainer reference

What **`@abeyjs/cli`** publishes as stable contract. Flags missing here but shown in **`--help`** → **trust the binary** — we aim to avoid desync.**Live implementation:** `packages/cli/src/cli.ts`.

## Install / invocation

```bash
npx @abeyjs/cli --help
# or global
npm i -g @abeyjs/cli
abeyjs --version
```

## Project commands

### `new` · `init` · `create` (aliases)

Scaffold folder with Vite + TS + OM plugin.

| Flag | Effect |
|------|--------|
| `--template admin|abeyjs|empty|minimal` | `empty` ≈ **`abeyjs`**. **`minimal`** ships fewer view files. |
| `--shell dashboard|appbar` | **Only** **`admin`** — sidebar vs compact app-bar layout. |
| `--skip-install` | Skip **`npm install`**. Env **`SKIP_ABEYJS_SCAFFOLD_INSTALL=1`** mirrors post-CI behavior. |

## OpenAPI wiring

### `abeyjs add openapi <dir>`

Inserts Vite proxies (`/api`, `/swagger` typical), `.env.example`, hooks markers **`ABEYJS-OPENAPI-WIRE`** in setup/routes when detected.

| Flag | Use |
|------|-----|
| `--proxy <url>` | Backend default proxy (e.g. local Kestrel). |
| `--openapi-path <path>` | Swagger JSON/YAML path on proxy host. |
| `--skip-install` | |

### `abeyjs connect <url-or-local-swagger-path>`

Produces **`.abeyjs/connect.json`** + **`abeyjs.connect.yml`**: contract metadata for later generators.

| Flag | |
|------|--|
| `--target <dir>` | App folder (default cwd/inferred). |
| `--insecure` | Accept untrusted TLS (dev). |

TTY mode classifies entities **crud** / **action** / **service** / skip interactively.

**Often required** before **`generate views`**.

## Generators

### `abeyjs generate views`

Emit OM views + TS from connected contract.

| Flag | |
|------|--|
| `--target` | App root. |
| `--scaffold minimal|full` | **`full`** adds **`src/app`**, **`src/ui`**, infra per generator template. |

### `abeyjs generate ecosystem <PascalName>`

Vertical slice **`omega/` + `ui/`** plus example tick.

| Flag | |
|------|--|
| `--target` | Target app. |
| `--feature-root` | Subfolder under **`src/`** (must stay under src). |
| `--show-nav` / `--no-show-nav` | Add visible **`componentRoute`** in admin sidebar template. |

### `abeyjs codegen <spec.yaml|json> -o <dir>`

**openapi-typescript** → path types + **`omegaSetup.generated.ts`** stub (does not replace domain logic). Useful typing baseline for huge OpenAPI.

## AbeyJs monorepo utility (core dev)

```bash
npm run abeyjs:generate:ecosystem -- MyModule --target examples/mi-admin
```

Root shorthand to avoid typoing **`node packages/cli/dist/cli.js`**.

## More detail

`packages/cli/README.md` accumulates release edge cases. README vs versioned binary divergence ⇒ **file a bug**.

Next: **`/guides/monorepo`**.
