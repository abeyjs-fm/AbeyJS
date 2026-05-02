import { defineConfig } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyVitePlugin } from "@abeyjs/compiler";

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
  clearScreen: false,
  customLogger: createAbeyViteLogger(),
  plugins: [abeyVitePlugin()],
  server: {
    port: 5190,
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
});
