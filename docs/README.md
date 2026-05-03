# AbeyJs documentation sources



The **`*.md` files in this folder** are an **optional source**: the site **does not** import them at runtime. Guides ship as OM under **`docs/web/src/views/guides/**`** (`*.view.html` + `*.view.ts`); edit those HTML files directly or regenerate from Markdown.



**Framework-style docs site (sidebar + prose):**



1. From the monorepo root: `npm install` if you have not already.

2. After changing the `*.md` files you want reflected: in **`docs/web`** run **`npm run generate:guides-html`** (regenerates each `app.doc.*.view.html`).

3. `npm run docs:dev` — Vite on port **5190**.

4. `npm run docs:build` / `npm run docs:preview` for the static build (`docs/web/dist`). Env vars used at build-time are **`DOC_SITE_ORIGIN`** (canonical / OG URLs) — see **`docs/web/.env.production`** (upstream default). **`docs/web/.env.example`** only documents variables for forks; it is **not** read by Vite.

**Production deploy (GitHub Pages):** see **`monorepo-desarrollo.md`** → *Publishing `docs/web` to GitHub Pages* (enable **GitHub Actions** as the Pages source, workflow **`.github/workflows/docs-github-pages.yml`**, **`DOCS_SITE_BASE`**, URL **`https://<user>.github.io/<repo>/`**). **SPA deep links:** **`vite-doc-spa-paths.ts`** is generated from **`abey-spa-paths.config.json`** on **`prebuild`** (see **`docs/web/README.md`**).



Site source: **`docs/web/`** — maintainer cheat sheet: **`docs/web/README.md`** (`bootstrapOmegaApp`, OM, **`omega-default.css`** theme + **`doc-shell.css`** + **`doc-guide.view.css`** in each guide’s shadow root).



### Pages (suggested order)



| Web route | OM views |

|---------|-----------|

| `/guides/intro` | `web/src/views/guides/intro/` |

| `/guides/quick-start` | `web/src/views/guides/quick-start/` |

| `/guides/bootstrap-shell` | `web/src/views/guides/bootstrap-shell/` |

| `/guides/routing` | `web/src/views/guides/routing/` |

| `/guides/abey-component` | `web/src/views/guides/abey-component/` |

| `/guides/data-views` | `web/src/views/guides/data-views/` |

| `/guides/runtime` | `web/src/views/guides/omega/` *(source folder still named `omega`; public URL uses **runtime**)* |

| `/guides/cli` | `web/src/views/guides/cli/` |

| `/guides/monorepo` | `web/src/views/guides/monorepo/` |

| `/guides/vision` | `web/src/views/guides/vision/` |

| `/guides/abey-templates` | `web/src/views/guides/abey-templates/` |

| `/guides/crud-auto` | `web/src/views/guides/crud-auto/` |

| `/guides/security` | `web/src/views/guides/security/` |

| `/guides/tables` | `web/src/views/guides/tables/` |

| `/guides/table-flows` | `web/src/views/guides/table-flows/` |

| `/guides/entities-forms` | `web/src/views/guides/entities-forms/` |



Each folder has **`*.view.ts`** and **`*.view.html`** with the same prose body. In the app they appear under **Guides** in the sidebar (index at **`/guides`**).



### Markdown → generator map (reference)



If you regenerate from `docs/*.md`: `intro-abeyjs.md`, `quick-start.md`, `view-bootstrap-shell.md`, `view-routing.md`, `view-abey-component.md`, `view-data-driven.md`, `omega-overview.md`, `cli-reference.md`, `monorepo-desarrollo.md`, `vision-omegax.md`, `abey-templates.md`, `crud-automatico-omegax.md`, `security-omegax.md`, `abey-table.md`, `abey-table-flows.md`, `entidad-modelo-y-formularios.md` (see `docs/web/scripts/generate-guide-html.mjs`).

