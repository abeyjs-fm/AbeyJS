/**
 * Generate a **`*.ts`** file exporting **`readonly string[]`** of app paths for static hosts
 * (copy **`index.html`** per path after Vite build). Uses TypeScript AST only.
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  collectNavPathsFromVariable,
  collectPageRouteInlineNavChildPaths,
  collectRouteCallPaths,
  collectStringFieldFromObjectArrayVar,
} from "./spa-fallback-paths-ast.js";

export type SyncSpaHtmlFallbackPackageSlugs = {
  /** e.g. **`PKGS`** */
  arrayName: string;
  /** e.g. **`slug`** */
  slugField: string;
  /** Prefix before each slug, e.g. **`/packages`** → **`/packages/core`** */
  pathPrefix: string;
};

export type SyncSpaHtmlFallbackFileRule = {
  /** File path relative to **`cwd`** */
  path: string;
  /** Include **`pageRoute` / `componentRoute`** first-arg string literals (default **`true`**). */
  routeCalls?: boolean;
  /** Collect **`path`** from **`const <name> = [ … ]`**. */
  navChildrenVar?: string;
  packageSlugs?: SyncSpaHtmlFallbackPackageSlugs;
  /** Second-arg **`pageRoute(..., { navChildren: […] })`**. */
  pageRouteInlineNavChildren?: boolean;
};

export type SyncSpaHtmlFallbackConfig = {
  /** Project root; default **`process.cwd()`**. */
  cwd?: string;
  /** Output **`.ts`** path relative to **`cwd`**. */
  output: string;
  /** Exported const name (default **`DOC_SPA_HTML_FALLBACK_PATHS`**). */
  exportName?: string;
  /** Docblock lines (no leading **` * `** — added automatically). */
  headerComment?: string[];
  files: SyncSpaHtmlFallbackFileRule[];
};

function parseSourceFile(absPath: string, text: string): ts.SourceFile {
  return ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function applyFileRule(cwd: string, rule: SyncSpaHtmlFallbackFileRule, out: Set<string>): void {
  const abs = path.resolve(cwd, rule.path);
  const text = fs.readFileSync(abs, "utf8");
  const sf = parseSourceFile(abs, text);

  const routeCalls = rule.routeCalls !== false;
  if (routeCalls) {
    for (const p of collectRouteCallPaths(sf)) out.add(p);
  }
  if (rule.navChildrenVar) {
    for (const p of collectNavPathsFromVariable(sf, rule.navChildrenVar)) out.add(p);
  }
  if (rule.packageSlugs) {
    const { arrayName, slugField, pathPrefix } = rule.packageSlugs;
    const prefix = pathPrefix.replace(/\/+$/, "");
    for (const slug of collectStringFieldFromObjectArrayVar(sf, arrayName, slugField)) {
      out.add(`${prefix}/${slug}`);
    }
  }
  if (rule.pageRouteInlineNavChildren) {
    for (const p of collectPageRouteInlineNavChildPaths(sf)) out.add(p);
  }
}

const defaultHeader = [
  "SPA deep-link HTML fallbacks for static hosting (e.g. duplicate `dist/index.html` as `dist/<path>/index.html`).",
  "",
  "AUTO-GENERATED — do not edit by hand.",
  "Regenerate: `abey-sync-spa-paths --config <json>` (from `@abeyjs/view`).",
];

/**
 * Collect unique app paths and write a TypeScript module:
 * **`export const NAME = [ ... ] as const satisfies readonly string[]`**
 */
export function syncSpaHtmlFallbackPaths(config: SyncSpaHtmlFallbackConfig): { paths: string[]; outputFile: string } {
  const cwd = path.resolve(config.cwd ?? process.cwd());
  const out = new Set<string>();

  for (const rule of config.files) {
    applyFileRule(cwd, rule, out);
  }

  out.delete("*");
  const sorted = [...out].sort((a, b) => a.localeCompare(b, "en"));

  const exportName = config.exportName?.trim() || "DOC_SPA_HTML_FALLBACK_PATHS";
  const lines = config.headerComment?.length ? config.headerComment : defaultHeader;
  const doc = ["/**", ...lines.map((l) => ` * ${l}`), " */", ""].join("\n");

  const body = sorted.map((p) => `  "${p}",`).join("\n");
  const outputAbs = path.resolve(cwd, config.output);
  fs.mkdirSync(path.dirname(outputAbs), { recursive: true });
  fs.writeFileSync(
    outputAbs,
    `${doc}export const ${exportName} = [\n${body}\n] as const satisfies readonly string[];\n`,
    "utf8",
  );

  return { paths: sorted, outputFile: outputAbs };
}
