# AbeyJs monorepo — how we work

The repo uses **npm workspaces**: publishable `packages/*`, demo `examples/*`, `docs/*` sources + Vite docs site.

## Folder map

| Folder | Contents |
|---------|-----------|
| `packages/core` … `packages/view` | Published framework core, synchronized internal semver. |
| `packages/compiler` | Vite plugin + OM compiler. |
| `packages/cli` | `abeyjs` binary. |
| `packages/openapi`, `http`, `validation`, `uikit`, etc. | Optional product layers. |
| `examples/mi-admin`, `crud-app`, … | Golden integration paths—breaking them in a PR signals regression. |
| `docs/*.md` | Guide Markdown (regenerate OM HTML via script). |
| `docs/web` | Consumable docs SPA (`npm run docs:dev`). |

## Root scripts we use daily

| Script | What it does |
|--------|----------|
| `npm run build` | Compiles TS packages in dependency order (publish / local link). |
| `npm run docs:dev` | Serves docs on **5190**. |
| `npm run docs:build` | Static output `docs/web/dist` (GitHub Pages / preview). |

Before a release version bump, review **`build:packages`** / **`publish:packages`** (maintainer sequence).

## Working on `packages/view` without publishing

With linked workspaces (`npm install` at root), `examples/*` resolves **`@abeyjs/view`** to the locally built tree after **`npm run build -w @abeyjs/view`** (or root build). TS changes missing in the consumer usually means **you forgot to build the package**—consumers do not transpile our raw src by default unless you add special path mapping.

## Docs web + Markdown

1. Edit **`docs/<file>.md`** (or OM HTML directly if skipping the pipeline).
2. From **`docs/web`**: `npm run generate:guides-html` writes HTML under **`src/views/guides/**`**.
3. `npm run docs:dev` or `docs:build`.

If you only touch TS doc views without MD, step 2 is unnecessary.

## Framework vs docs PRs

Publishable runtime change → PR touches `packages/*` plus ideally a test or minimal repro. Docs-only explanatory change → `docs/*.md` + regenerate guide HTML.

If you already read **`/guides/cli`**, next jump is often **`/guides/crud-auto`** (OpenAPI pipeline) or **`/guides/vision`** (product contract).
