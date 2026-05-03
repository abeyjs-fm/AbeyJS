import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyViteMalformedUriGuard } from "@abeyjs/view/dev/vite-malformed-uri-guard";
import { abeyVitePlugin } from "@abeyjs/compiler";
import { DOC_SPA_HTML_FALLBACK_PATHS } from "./vite-doc-spa-paths.js";

function resolveDocSiteOrigin(
  mode: string,
  envFiles: Record<string, string>,
): string {
  const raw =
    process.env.DOC_SITE_ORIGIN?.trim() ||
    process.env.DOCS_SITE_ORIGIN?.trim() ||
    envFiles.DOC_SITE_ORIGIN?.trim() ||
    envFiles.DOCS_SITE_ORIGIN?.trim() ||
    "";
  const stripped = raw.replace(/\/+$/, "");
  if (stripped) return stripped;
  if (mode === "production") {
    throw new Error(
      "[docs/web] DOC_SITE_ORIGIN (or DOCS_SITE_ORIGIN) is required for production build. Set docs/web/.env.production or export the variable (see .env.example).",
    );
  }
  // Dev: placeholders in index.html when no .env.development value.
  return "http://localhost:5190";
}

/**
 * Replaces **`%DOC_SITE_ORIGIN%`** in **`index.html`** (no trailing slash).
 * Priority: **`process.env`** (e.g. CI), then **`loadEnv`** (`.env`, `.env.[mode]`). See **`docs/web/.env.example`**.
 */
function docsSeoIndexHtml(getOrigin: () => string): Plugin {
  const description =
    "AbeyJs framework documentation — AbeyJS runtime, OM templates, routed shell (@abeyjs/view), CLI, OpenAPI-assisted CRUD, tables, forms, and monorepo guides.";
  return {
    name: "docs-seo-index-html",
    enforce: "pre",
    transformIndexHtml(html) {
      const origin = getOrigin();
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

/**
 * Copies root **`dist/index.html`** under each **`DOC_SPA_HTML_FALLBACK_PATHS`** (**`vite-doc-spa-paths.ts`**).
 * Keeps vite config independent of **`src/routes.ts`** (OM imports).
 * @see `docs/monorepo-desarrollo.md` — **SPA deep links on GitHub Pages**.
 */
function docsSpaHtmlFallbackDirs(): Plugin {
  let outDirAbs = "";
  return {
    name: "docs-spa-html-fallback-dirs",
    apply: "build",
    enforce: "post",
    configResolved(cfg) {
      outDirAbs = path.resolve(cfg.root, cfg.build.outDir);
    },
    /**
     * `closeBundle` can run before Vite persists `dist/index.html` (Rollup vs HTML emission order).
     * `writeBundle` runs after emitted files are finalized; prefer in-memory asset from `bundle`.
     */
    writeBundle(outputOptions, bundle) {
      const dir = outputOptions.dir ?? outDirAbs;
      const fromBundle = bundle["index.html"];
      let html: string;
      if (fromBundle && fromBundle.type === "asset") {
        const src = fromBundle.source;
        html =
          typeof src === "string"
            ? src
            : Buffer.from(src).toString("utf8");
      } else {
        const indexPath = path.join(dir, "index.html");
        if (!existsSync(indexPath)) {
          throw new Error(
            `[docs-spa-html-fallback-dirs] Missing index.html in bundle and on disk (${indexPath}).`,
          );
        }
        html = readFileSync(indexPath, "utf8");
      }
      for (const pathname of DOC_SPA_HTML_FALLBACK_PATHS) {
        const relDir = pathname.replace(/^\//, "");
        const targetDir = path.join(dir, relDir);
        mkdirSync(targetDir, { recursive: true });
        writeFileSync(path.join(targetDir, "index.html"), html, "utf8");
      }
    },
  };
}

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** Framework docs SPA: OM guides (`*.view.html`). */
export default defineConfig(({ mode }) => {
  const envFiles = loadEnv(mode, configDir, "");
  const origin = (): string => resolveDocSiteOrigin(mode, envFiles);

  return {
    appType: "spa",
    base: docsSiteBase(),
    publicDir: "public",
    clearScreen: false,
    customLogger: createAbeyViteLogger(),
    plugins: [
      abeyViteMalformedUriGuard({ locale: "es" }),
      docsSeoIndexHtml(origin),
      abeyVitePlugin(),
      docsSpaHtmlFallbackDirs(),
    ],
    server: {
      port: 5190,
      proxy: {
        "/api/deezer": {
          target: "https://api.deezer.com",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/deezer/, ""),
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
    },
  };
});
