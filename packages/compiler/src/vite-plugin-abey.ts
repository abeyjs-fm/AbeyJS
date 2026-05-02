/**
 * Vite **`pre`** plugin for AbeyJs templates.
 *
 * ## Virtual module IDs
 * Imports such as `./screen.view.html` resolve to `virtual:abeyjs-abey:<base64url(absPath)>`, so dependency pre-bundling
 * never treats them as SPA `index.html` entries.
 *
 * ## Hooks
 * | Hook | Behaviour |
 * |------|------------|
 * | `config` | Sets `optimizeDeps.noDiscovery` + empty `include`; merges `esbuild.tsconfigRaw.compilerOptions.experimentalDecorators: true` so `@AbeyComponent` in `*.ts` is lowered (avoids `SyntaxError: Invalid or unexpected token` on lazy chunks). |
 * | `configResolved` | Remembers `cfg.root` for locating `abey.json`. |
 * | `resolveId` | Maps template paths → virtual ids; resolves `/abey-styles.js` → internal virtual styles module. |
 * | `load` | Reads disk, runs `compileAbeyToTs`, then **esbuild.transform** TS→JS with `experimentalDecorators`. |
 * | `transformIndexHtml` | (removed) Global styles from `abey.json` load via `import "/abey-styles.js"` in `main.ts` so production builds emit them. |
 * | `handleHotUpdate` | Full-reload Dev server on `.view.html`/`.abey` or `abey.json` changes (granular HMR TBD). |
 *
 * ## `abey.json` (optional)
 * At Vite `{root}`/ `abey.json`: `{ "styles": ["./path/global.css", ...] }` — each path becomes a bare `import` in the synthetic styles bundle.
 *
 * ## Note
 * The plugin does not invoke `parse5` directly; compilation lives in `./abey-compile.ts`.
 */
import type { Plugin, UserConfig } from "vite";
import { compileAbeyToTs } from "./abey-compile.ts";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { transform } from "esbuild";
import { Buffer } from "node:buffer";

/** Merge `experimentalDecorators: true` into Vite's esbuild TS options so `@AbeyComponent` strips correctly. */
function mergeEsbuildDecorators(userConfig: UserConfig): UserConfig["esbuild"] | undefined {
  if (userConfig.esbuild === false) return undefined;
  const userEsbuild =
    userConfig.esbuild && typeof userConfig.esbuild === "object" ? userConfig.esbuild : {};
  const raw = userEsbuild.tsconfigRaw;
  if (typeof raw === "string") {
    // Caller passed a serialized tsconfig string; cannot merge safely.
    return { ...userEsbuild };
  }
  const prevCo =
    raw &&
    typeof raw === "object" &&
    "compilerOptions" in raw &&
    raw.compilerOptions &&
    typeof (raw as { compilerOptions: unknown }).compilerOptions === "object"
      ? { ...((raw as { compilerOptions: Record<string, unknown> }).compilerOptions) }
      : {};
  const tsconfigRaw =
    raw && typeof raw === "object"
      ? { ...(raw as Record<string, unknown>), compilerOptions: { ...prevCo, experimentalDecorators: true } }
      : { compilerOptions: { experimentalDecorators: true } };
  return { ...userEsbuild, tsconfigRaw };
}

export function abeyVitePlugin(): Plugin {
  const VIRTUAL_PREFIX = "virtual:abeyjs-abey:";
  const VIRTUAL_STYLES = "virtual:abey-styles";
  const STYLES_ENTRY = "/abey-styles.js";
  const isTemplateFile = (p: string): boolean => p.endsWith(".abey") || p.endsWith(".view.html");
  const encodeAbs = (absPath: string): string =>
    Buffer.from(absPath, "utf8")
      .toString("base64")
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  const toVirtualId = (absPath: string): string => VIRTUAL_PREFIX + encodeAbs(absPath);
  const virtualToAbs = new Map<string, string>();
  let viteRoot = process.cwd();
  const abeyJsonPath = () => resolve(viteRoot, "abey.json");
  return {
    name: "abeyjs:abey",
    enforce: "pre",
    configResolved(cfg) {
      viteRoot = cfg.root ?? process.cwd();
    },
    config(userConfig) {
      // Vite's dep-scan uses `optimizeDeps.entries` and, by default, may include **/*.html.
      // Our templates end with `.view.html` and are *not* app entrypoints, so scanning them
      // as HTML entries causes esbuild to try to load `html:virtual:...` and crash.
      const esbuild = mergeEsbuildDecorators(userConfig);
      return {
        optimizeDeps: {
          // Vite 6: disable discovery so dep-scan won't choke on `html:virtual:*`.
          noDiscovery: true,
          include: [],
        },
        ...(esbuild !== undefined ? { esbuild } : {}),
      };
    },
    resolveId(source, importer) {
      if (source === STYLES_ENTRY) return VIRTUAL_STYLES;
      if (source === VIRTUAL_STYLES) return source;
      if (isTemplateFile(source)) {
        // Resolve to a virtual JS module so Vite/esbuild won't treat it as HTML during dep scan.
        const abs = importer ? resolve(dirname(importer), source) : resolve(source);
        const vid = toVirtualId(abs);
        virtualToAbs.set(vid, abs);
        return vid;
      }
      if (source.startsWith(VIRTUAL_PREFIX)) {
        return source;
      }
      return null;
    },
    async load(id) {
      if (id === VIRTUAL_STYLES) {
        const p = abeyJsonPath();
        if (!existsSync(p)) return { code: "export {}", map: null };
        const raw = await readFile(p, "utf-8");
        let cfg: unknown;
        try {
          cfg = JSON.parse(raw);
        } catch {
          cfg = null;
        }
        const styles = Array.isArray((cfg as any)?.styles) ? ((cfg as any).styles as unknown[]) : [];
        const imports = styles
          .filter((s) => typeof s === "string" && s.trim().length > 0)
          .map((s) => `import ${JSON.stringify(String(s))};`)
          .join("\n");
        return { code: imports || "export {}", map: null };
      }
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      const fileId = virtualToAbs.get(id);
      if (!fileId) return null;
      const src = await readFile(fileId, "utf-8");
      const out = compileAbeyToTs(src, fileId);
      const js = await transform(out.code, {
        loader: "ts",
        sourcemap: true,
        sourcefile: fileId,
        tsconfigRaw: {
          compilerOptions: {
            // Allow the compiler to emit `@AbeyComponent(...)` in frontmatter-generated classes.
            experimentalDecorators: true,
          },
        },
      });
      return { code: js.code, map: js.map ?? null };
    },
    handleHotUpdate(ctx) {
      if (!isTemplateFile(ctx.file)) {
        if (ctx.file === abeyJsonPath()) {
          ctx.server.ws.send({ type: "full-reload", path: "*" });
          return [];
        }
        return;
      }
      // Invalidate all modules that came from this file.
      // On Windows the path/casing may differ from what we encoded, so rely on moduleGraph.
      const modsByFile = ctx.server.moduleGraph.getModulesByFile(ctx.file);
      if (modsByFile) {
        for (const m of modsByFile) {
          ctx.server.moduleGraph.invalidateModule(m);
        }
      }
      // Also try to invalidate by our virtual id (best-effort).
      const vid = toVirtualId(resolve(ctx.file));
      virtualToAbs.set(vid, resolve(ctx.file));
      const modById = ctx.server.moduleGraph.getModuleById(vid);
      if (modById) {
        ctx.server.moduleGraph.invalidateModule(modById);
      }

      // MVP: safest is full reload (later we can do granular HMR).
      ctx.server.ws.send({ type: "full-reload", path: "*" });
      return [];
    },
  };
}

