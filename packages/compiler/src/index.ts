/**
 * AbeyJs template compiler public API:
 * - `compileAbeyToTs` — source string → TypeScript module (no Vite required).
 * - `abeyVitePlugin` — Vite `pre` plugin, virtual modules for templates, optional `abey.json` styles.
 *
 * Apps usually depend on `@abeyjs/view` because emitted code imports `AbeyComponent` / `mount`.
 */
export { compileAbeyToTs, type CompileAbeyResult, type AbeyParseResult } from "./abey-compile.ts";
export { abeyVitePlugin } from "./vite-plugin-abey.ts";

