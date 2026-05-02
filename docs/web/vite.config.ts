import { defineConfig, type Plugin } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyVitePlugin } from "@abeyjs/compiler";

/** Fallback when **`DOC_SITE_ORIGIN`** unset (canonical / Open Graph URLs must be absolute). */
const DEFAULT_DOC_SITE_ORIGIN = "https://abeyjs-fm.github.io/AbeyJS";

function resolveDocSiteOrigin(): string {
  const raw =
    process.env.DOC_SITE_ORIGIN?.trim() ||
    process.env.DOCS_SITE_ORIGIN?.trim() ||
    "";
  const chosen = raw || DEFAULT_DOC_SITE_ORIGIN;
  return chosen.replace(/\/+$/, "");
}

/**
 * **`%DOC_SITE_ORIGIN%`** in **`index.html`** → **`https://&lt;user&gt;.github.io/&lt;repo&gt;`** without trailing slash
 * (**`DOC_SITE_ORIGIN`** / **`DOCS_SITE_ORIGIN`** in CI or `.env.development.local`).
 */
function docsSeoIndexHtml(): Plugin {
  const description =
    "AbeyJs framework documentation — Omega runtime, OM templates, routed shell (@abeyjs/view), CLI, OpenAPI-assisted CRUD, tables, forms, and monorepo guides.";
  return {
    name: "docs-seo-index-html",
    enforce: "pre",
    transformIndexHtml(html) {
      const origin = resolveDocSiteOrigin();
      const patched = html.replace(/%DOC_SITE_ORIGIN%/g, origin);
      const ld = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AbeyJs Documentation",
        url: `${origin}/`,
        description,
        inLanguage: "en",
      };
      return {
        html: patched,
        tags: [
          {
            tag: "script",
            attrs: { type: "application/ld+json" },
            children: JSON.stringify(ld),
            injectTo: "head",
          },
        ],
      };
    },
  };
}

/**
 * GitHub Pages subpath: set env DOCS_SITE_BASE to /<RepoSlug>/ (leading and trailing slashes).
 * Casing must match the GitHub Pages URL segment. Omit locally for dev (base "/" in code below).
 */
function docsSiteBase(): string {
  const raw = process.env.DOCS_SITE_BASE?.trim();
  if (!raw || raw === "/" || raw === "") return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

/** Framework docs SPA: OM guides (`*.view.html`). */
export default defineConfig({
  appType: "spa",
  base: docsSiteBase(),
  publicDir: "public",
  clearScreen: false,
  customLogger: createAbeyViteLogger(),
  plugins: [docsSeoIndexHtml(), abeyVitePlugin()],
  server: {
    port: 5190,
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
});
