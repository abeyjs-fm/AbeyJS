/**
 * Docs site Vite — what you maintain vs reuse:
 *
 * | You touch | Prefer reuse from `@abeyjs/view` |
 * |-----------|-----------------------------------|
 * | **`DOCS_SITE_BASE`**, **`DOC_SITE_ORIGIN`** (`.env`/CI): deploy URL + OG/canonical — | **`resolveAbeyDocsCanonicalOrigin`**, **`abeyViteDeployBase`**, SPA fallbacks **`abeyViteSpaHtmlFallbackDirs`**, **`abeyViteCanonicalSitePlugin`** |
 * | This file: SEO **copy** (`jsonLdDescription`), **proxy** (`/api/deezer`), **port** **`5190`**, **`vite-doc-spa-paths.ts`** import | **`createAbeyViteLogger`**, **`abeyViteMalformedUriGuard`**, **`abeyVitePlugin`** |
 *
 * Fallback path list (**`vite-doc-spa-paths.ts`**) is generated — run **`npm run docs:spa-paths:sync`** (or **`prebuild`**).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import {
  abeyViteCanonicalSitePlugin,
  abeyViteDeployBase,
  abeyViteSpaHtmlFallbackDirs,
  resolveAbeyDocsCanonicalOrigin,
} from "@abeyjs/view/dev/vite-docs-static-site";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyViteMalformedUriGuard } from "@abeyjs/view/dev/vite-malformed-uri-guard";
import { abeyVitePlugin } from "@abeyjs/compiler";
import { DOC_SPA_HTML_FALLBACK_PATHS } from "./vite-doc-spa-paths.js";

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** AbeyJs-specific; forks change this blob only if they want different JSON-LD. */
const SITE_DESCRIPTION =
  "AbeyJs framework documentation — AbeyJS runtime, OM templates, routed shell (@abeyjs/view), CLI, OpenAPI-assisted CRUD, tables, forms, and monorepo guides.";

export default defineConfig(({ mode }) => {
  const envFiles = loadEnv(mode, configDir, "");
  const origin = (): string =>
    resolveAbeyDocsCanonicalOrigin(mode, envFiles, {
      devFallbackOrigin: "http://localhost:5190",
    });

  return {
    appType: "spa",
    base: abeyViteDeployBase(),
    publicDir: "public",
    clearScreen: false,
    customLogger: createAbeyViteLogger(),
    plugins: [
      abeyViteMalformedUriGuard({ locale: "es" }),
      abeyViteCanonicalSitePlugin({
        getOrigin: origin,
        jsonLd: {
          siteName: "AbeyJs Documentation",
          description: SITE_DESCRIPTION,
          inLanguage: "en",
        },
      }),
      abeyVitePlugin(),
      abeyViteSpaHtmlFallbackDirs({
        paths: DOC_SPA_HTML_FALLBACK_PATHS,
      }),
    ],
    server: {
      port: 5190,
      proxy: {
        "/api/deezer": {
          target: "https://api.deezer.com",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/deezer/, ""),
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
    },
  };
});
