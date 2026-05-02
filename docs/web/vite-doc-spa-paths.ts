/**
 * Application paths (leading `/`, no repo basename) copied to `dist/<path>/index.html` after `vite build`,
 * so GitHub Pages returns HTTP 200 on deep links instead of only `404.html` with a 404 status.
 *
 * Full rationale and maintenance rules: `docs/monorepo-desarrollo.md` → **Publishing `docs/web` to GitHub Pages** →
 * **SPA deep links on GitHub Pages (`vite-doc-spa-paths.ts`)**.
 *
 * Keep this list in sync with `getRoutes()` in `src/routes.ts`.
 */
export const DOC_SPA_HTML_FALLBACK_PATHS = [
  "/panel",
  "/guides",
  "/guides/intro",
  "/guides/quick-start",
  "/guides/bootstrap-shell",
  "/guides/routing",
  "/guides/abey-component",
  "/guides/data-views",
  "/guides/omega",
  "/guides/cli",
  "/guides/monorepo",
  "/guides/vision",
  "/guides/abey-templates",
  "/guides/crud-auto",
  "/guides/security",
  "/guides/tables",
  "/guides/table-flows",
  "/guides/entities-forms",
  "/omega",
  "/omega/core",
  "/omega/runtime",
  "/omega/state",
  "/omega/view",
  "/omega/compiler",
  "/omega/cli",
  "/omega/http",
  "/omega/openapi",
  "/omega/validation",
  "/omega/uikit",
  "/omega/agents",
  "/omega/flows",
  "/omega/inspector",
] as const satisfies readonly string[];
