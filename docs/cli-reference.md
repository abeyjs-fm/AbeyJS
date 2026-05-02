# `abeyjs` CLI — maintainer reference

What **`@abeyjs/cli`** publishes as stable contract. Flags missing here but shown in **`--help`** → **trust the binary** — we aim to avoid desync. **Live implementation:** `packages/cli/src/cli.ts`.

## Install and how you invoke it

| Setup | Run |
|--------|-----|
| **Global** — `npm install -g @abeyjs/cli`; `abeyjs` is on your `PATH` | `abeyjs …` |
| **Project** — `@abeyjs/cli` in **`devDependencies`** (default in templates): from project root | `npx abeyjs …` (uses **`node_modules/.bin`**) |
| **One-off** — no entry in `package.json` | `npx @abeyjs/cli …` |

**Global examples**

```bash
abeyjs --help
abeyjs init my-app --template admin
```

**Local-to-project examples** (same subcommands, prefixed with `npx`):

```bash
npx abeyjs --help
npx abeyjs generate views
```

**Shorthand in this page:** section titles use **`abeyjs …`**. If you did **not** install globally, substitute **`npx abeyjs …`**.

## Project commands

### `new` · `init` · `create` (aliases)

Scaffold folder with Vite + TS + OM plugin.

| Flag | Effect |
|------|--------|
| `--template admin` · `abeyjs` · `empty` · `minimal` | `empty` ≈ **`abeyjs`**. **`minimal`** ships fewer view files. |
| `--shell dashboard` · `appbar` | **Only** with **`admin`** — sidebar vs compact app-bar layout. |
| `--skip-install` | Skip **`npm install`**. Env **`SKIP_ABEYJS_SCAFFOLD_INSTALL=1`** mirrors post-CI behavior. |

## OpenAPI wiring

### `abeyjs add openapi <dir>`

Inserts Vite proxies (`/api`, `/swagger` typical), `.env.example`, hooks markers **`ABEYJS-OPENAPI-WIRE`** in setup/routes when detected.

| Flag | Use |
|------|-----|
| `--proxy <url>` | Backend default proxy (e.g. local Kestrel). |
| `--openapi-path <path>` | Swagger JSON/YAML path on proxy host. |
| `--skip-install` | Skip `npm install` after patching. |

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
| `--scaffold minimal` · `full` | Or legacy **`--full-scaffold`**. |

### `abeyjs generate ecosystem <PascalName>`

Vertical slice **`omega/` + `ui/`** plus example tick.

| Flag | |
|------|--|
| `--target` | Target app. |
| `--feature-root` | Subfolder under **`src/`** (must stay under src). |
| `--show-nav` / `--no-show-nav` | Add visible **`componentRoute`** in admin sidebar template. |

### `abeyjs codegen <spec.yaml>` / `<spec.json>` `-o <dir>`

**openapi-typescript** → path types + **`omegaSetup.generated.ts`** stub (does not replace domain logic). Useful typing baseline for huge OpenAPI.

## AbeyJs monorepo utility (core dev)

Inside this repo, npm scripts call the CLI from the workspace (not necessarily global):

```bash
npm run abeyjs:generate:ecosystem -- MyModule --target examples/mi-admin
```

Shorthand to avoid **`node packages/cli/dist/cli.js`**. In **an external app**, use global **`abeyjs …`** or project-local **`npx abeyjs …`** as in the install table above.

## More detail

`packages/cli/README.md` accumulates release edge cases. README vs versioned binary divergence ⇒ **file a bug**.

Next: **`/guides/monorepo`**.
