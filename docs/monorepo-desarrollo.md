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

---

## Publishing `docs/web` to GitHub Pages

GitHub Pages for a **project site** serves the SPA under **`https://<user>.github.io/<repo>/`**. Assets and the History API pathname include that **`/<repo>/`** segment, so the docs app and **`@abeyjs/view`** need an explicit base.

### Repo settings

1. **Settings → Pages → Build and deployment**
2. **Source**: **GitHub Actions** (not “Deploy from a branch” unless you intentionally use `gh-pages`).

### Workflow in this monorepo

File: **`.github/workflows/docs-github-pages.yml`**

| Step | Purpose |
|------|---------|
| `npm ci` | Install workspaces (linked `packages/*`). |
| `npm run build` (root) | Compiles **`packages/*`** to **`dist/`** (`.js` + `.d.ts`). **`docs/web`** **`tsc`** resolves **`@abeyjs/view`** etc. via **`package.json` `types` → `dist/index.d.ts`**; without this step CI fails with **`TS2307`** because **`dist`** is not committed. |
| `DOCS_SITE_BASE="/<repo-lowercase>/"` | Vite **`base`** for **`docs/web`** (`vite.config.ts` reads **`process.env.DOCS_SITE_BASE`**; default **`/`** when unset → local **`npm run docs:dev`** unchanged). |
| `npm run docs:build` | Root script → **`abeyjs-docs-web`** **`tsc` + `vite build`**. |
| Copy **`index.html` → `404.html`** | So deep links (**`/guides/quick-start`**, etc.) return the SPA shell; client router resolves the route. |
| **`.nojekyll`** | Disables Jekyll so files GitHub might ignore otherwise are kept. |

Triggers: **`push`** to **`main`** or **`master`**, plus **`workflow_dispatch`**. The artifact is deployed with **`actions/deploy-pages`**.

Published URL follows GitHub rules (repo segment is **lowercase** in practice); the workflow lowercases **`${GITHUB_REPOSITORY##*/}`** when building **`DOCS_SITE_BASE`**.

### **`@abeyjs/view`** support (`pathnameBase`)

For any AbeyJs SPA hosted under a subpath (not only this docs site):

| Piece | Behavior |
|-------|----------|
| **`MountRoutedAppConfig.pathnameBase`** | Pass the same string as Vite **`import.meta.env.BASE_URL`** (typically ends with **`/`**, e.g. **`/AbeyJs/`**). Internally **`normalizeBasename`** strips trailing slashes where needed for path math. |
| **`createPathRouter({ basename })`** | **`pathname`** **`getPath`** / **`pushState`** use app paths (**`/guides/...`**) while the browser URL includes the prefix (**`/{repo}/guides/...`**). |
| **Shell sidebar links** | **`href`** is prefixed so “open in new tab” stays on the deployed site; clicks still **`navigate`** with app-relative paths (**`dataset.abey-path`** wins). |
| **`bootstrapOmegaApp` + `auth.publicPaths`** | Public path checks **`stripBasenameFromPathname`** against **`pathnameBase`**; **`redirectIfAuthed`** builds a full prefixed URL. |

Exported helpers (**`normalizeBasename`**, **`withBasename`**, **`stripBasenameFromPathname`**) live in **`@abeyjs/view`** for custom glue if needed.

### Docs-only helpers (`docs/web`)

| File | Role |
|------|------|
| **`src/docs-site-url.ts`** | Builds prefixed **`href`**s and **`rewriteDocsSiteAnchors`** on static **`href="/..."`** links in **`app.docs.home`** / **`app.docs.welcome`** shadow roots when **`BASE_URL` ≠ `/`**. Public welcome search uses **`docsSiteAssign`** because there is no shell **`router`** yet. |
| **`src/main.ts`** | **`pathnameBase: import.meta.env.BASE_URL`** on **`shell`** so the authenticated docs shell tracks subpath routing. |

### Local production check (optional)

```bash
npm run docs:build
npm run docs:preview -w abeyjs-docs-web   # vite preview · dist
```

Simulating **`DOCS_SITE_BASE`** for a subpath build: set the env var **before** `npm run docs:build` (CI uses Linux; no MSYS quirks). **Git Bash on Windows** can reinterpret values like **`/MyRepo/`** as disk paths—in that case preview without subpath or use WSL/Linux for subpath **`dist`** verification.

### Custom domain (@ apex repo)

If the site is served at the apex of **`user.github.io`** with **`base: '/'`**, you do **not** need **`DOCS_SITE_BASE`** or **`pathnameBase`** overrides beyond defaults.
