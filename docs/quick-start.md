# Quick start

The CLI gives you reproducible projects. This guide lists **exactly which files to touch** after `npm run dev`.

## Create a new project

Install the binary (`npm i -g @abeyjs/cli`) or use `npx` without a global install:

```bash
npx @abeyjs/cli init my-app --template admin
cd my-app
npm run dev
```

### Important `init` flags

| Flag | Value | Effect |
|------|--------|--------|
| `--template` | `admin` | Omega dashboard: sidebar, app bar, theme; base for most “product” examples. |
| | `abeyjs` · `empty` | Vite + OM + lighter sample views, less prefab admin chrome. |
| | `minimal` | Minimal scaffold (useful when isolating `@abeyjs/core` without full view). |
| `--shell` | `dashboard` (admin default) vs `appbar` | Only with `admin`: classic sidebar vs more compact variant. |
| `--skip-install` | | Skip `npm install` after scaffolding (`SKIP_ABEYJS_SCAFFOLD_INSTALL=1` from env does the same). |

## Generated repo map (`admin`)

| Typical path | Responsibility |
|-------------|-----------------|
| `src/main.ts` | Single entry: **`bootstrapOmegaApp`**, **`omega-default.css`**, **`import "/abey-styles.js"`** from `abey.json`. Optionally **`fetchSidebarNav` + buildRoutesFromApi`** before **`shell.routes`**. |
| `src/routes.ts` | **`AppRoute[]`**: **`componentRoute`** / **`pageRoute`**; URLs and what each mounts. |
| `src/omegaSetup.ts` | **`createOmegaRuntime()`**, module registry, intent listeners. Missing registration here ⇒ dispatch into the void. |
| `vite.config.ts` | `plugins`: include **`abeyVitePlugin()`**. Optionally **`@abeyjs/view/dev/vite-logger`** in dev for OM compile logs. |
| `abey.json` | **`styles`** the plugin bundles as **`/abey-styles.js`**. Missing + no imports ⇒ bare or incomplete UI. |
| `index.html` | **`#app`**. If using FA shell icons, declare Font Awesome here (shell uses **`fa-solid`**, etc.). |
| `src/views/**/*.view.html` · **`.view.ts`** | OM screens. Convention: **`app.<feature>.view.*`** aligned with **`abeyjs generate ecosystem`**. |
| `public/mock-nav.json` | Optional dev: **`{ "items": [ { path, label, navIconFa?, children? } ] }`** to test server menu without a backend. |

## Must-have imports (`main.ts`)

1. **`import "/abey-styles.js"`** — plugin resolves the bundle from `abey.json`. Skip this **and** expect global OM/UI styles ⇒ broken prod build footgun when copying odd `index.html`.
2. **`import "@abeyjs/view/theme/omega-default.css"`** — **`--abey-*` tokens**, shell chrome, list/form baseline.

Verify **`tsconfig.json`**: template projects enable **`experimentalDecorators`** for **`@AbeyComponent`** views.

## Minimal `abey.json` and why

```json
{
  "styles": ["./src/styles/global.css"]
}
```

Paths are relative to `abey.json`. Change a token there → Vite hashes and HMR like any CSS. For OM table UI some projects also list **`@abeyjs/uikit/styles/abey-table.css`**.

## Docs web in this monorepo

After cloning AbeyJs, browse this same content compiled as OM views:

```bash
# repo root
npm install
npm run docs:dev
```

Default port **5190**. Markdown in **`docs/*.md`** becomes guide HTML via **`npm run generate:guides-html`** inside **`docs/web`**.

Next: **`/guides/bootstrap-shell`**.
