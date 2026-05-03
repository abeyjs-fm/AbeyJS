/**
 * Vite helpers for static-hosted SPAs (e.g. GitHub Pages **`base`** + **`dist/<path>/index.html`** fallbacks).
 * Keeps **`vite.config.ts`** focused on repo-specific knobs (SEO copy, proxies, ports).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const ORIGIN_ENV_KEYS = ["DOC_SITE_ORIGIN", "DOCS_SITE_ORIGIN"] as const;

function firstEnvOrigin(processEnv: NodeJS.ProcessEnv, envFiles: Record<string, string>): string {
  for (const k of ORIGIN_ENV_KEYS) {
    const v =
      typeof processEnv[k] === "string" ? processEnv[k].trim() : "";
    if (v) return v.replace(/\/+$/, "");
    const fv = typeof envFiles[k] === "string" ? envFiles[k].trim() : "";
    if (fv) return fv.replace(/\/+$/, "");
  }
  return "";
}

/**
 * Canonical site origin (**no trailing slash**) for **`%DOC_SITE_ORIGIN%`** in `index.html` and metadata.
 *
 * **`process.env`** wins over **`loadEnv`** results. In **`production`** mode, throws if unset.
 */
export function resolveAbeyDocsCanonicalOrigin(
  mode: string,
  envFiles: Record<string, string>,
  opts?: {
    /** When mode is not production and origin env is empty — default **`http://localhost:5173`**. */
    devFallbackOrigin?: string;
  },
): string {
  const stripped = firstEnvOrigin(process.env, envFiles);
  if (stripped) return stripped;
  if (mode === "production") {
    throw new Error(
      "[@abeyjs/view vite-docs-static-site] Production build requires DOC_SITE_ORIGIN or DOCS_SITE_ORIGIN (CLI env or .env.[mode]).",
    );
  }
  return opts?.devFallbackOrigin?.replace(/\/+$/, "") ?? "http://localhost:5173";
}

/**
 * Vite **`base`** from **`process.env.DOCS_SITE_BASE`**: **`/<slug>/`** for GitHub Pages project sites,
 * **`/`** when unset (local dev).
 */
export function abeyViteDeployBase(): string {
  const raw = process.env.DOCS_SITE_BASE?.trim();
  if (!raw || raw === "/" || raw === "") return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

export type AbeyViteCanonicalSitePluginOptions = {
  getOrigin: () => string;
  /** Default **`%DOC_SITE_ORIGIN%`**. */
  originPlaceholder?: string;
  jsonLd: {
    siteName: string;
    description: string;
    inLanguage?: string;
  };
};

/**
 * **`transformIndexHtml`**: substitutes **`originPlaceholder`**; injects **`WebSite`** JSON-LD.
 */
export function abeyViteCanonicalSitePlugin(
  opts: AbeyViteCanonicalSitePluginOptions,
): Plugin {
  const placeholder = opts.originPlaceholder ?? "%DOC_SITE_ORIGIN%";
  const esc = escapeRegExp(placeholder);
  return {
    name: "abey-vite-canonical-site",
    enforce: "pre",
    transformIndexHtml(html: string) {
      const origin = opts.getOrigin();
      const patched = html.replace(new RegExp(esc, "g"), origin);
      const ld = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: opts.jsonLd.siteName,
        url: `${origin}/`,
        description: opts.jsonLd.description,
        inLanguage: opts.jsonLd.inLanguage ?? "en",
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type AbeyViteSpaHtmlFallbackDirsOptions = {
  /** SPA pathnames (**`/guides/foo`**) emitted as **`dist/guides/foo/index.html`**. */
  paths: readonly string[];
};

/**
 * After build, writes the same **`index.html`** shell under **`dist/<path>/`** for static hosts without SPA rewrites.
 * Uses **`writeBundle`** (not **`closeBundle`**) so the HTML asset is available.
 */
export function abeyViteSpaHtmlFallbackDirs(opts: AbeyViteSpaHtmlFallbackDirsOptions): Plugin {
  let outDirAbs = "";
  return {
    name: "abey-vite-spa-html-fallback-dirs",
    apply: "build",
    enforce: "post",
    configResolved(cfg) {
      outDirAbs = path.resolve(cfg.root, cfg.build.outDir);
    },
    writeBundle(outputOptions, bundle) {
      const dir = outputOptions.dir ?? outDirAbs;
      const fromBundle = bundle["index.html"];
      let html: string;
      if (fromBundle?.type === "asset") {
        const src = fromBundle.source;
        html =
          typeof src === "string" ? src : Buffer.from(src).toString("utf8");
      } else {
        const indexPath = path.join(dir, "index.html");
        if (!existsSync(indexPath)) {
          throw new Error(
            `[@abeyjs/view abey-vite-spa-html-fallback-dirs] Missing index.html in bundle and on disk (${indexPath}).`,
          );
        }
        html = readFileSync(indexPath, "utf8");
      }
      for (const pathname of opts.paths) {
        const relDir = pathname.replace(/^\//, "");
        const targetDir = path.join(dir, relDir);
        mkdirSync(targetDir, { recursive: true });
        writeFileSync(path.join(targetDir, "index.html"), html, "utf8");
      }
    },
  };
}
