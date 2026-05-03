// Dev-only Vite plugin: tame `decodeURI` throws in Vite static middleware (`URI malformed` spam).
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

export type AbeyViteMalformedUriLocale = "en" | "es";

export type AbeyViteMalformedUriGuardOptions = {
  /**
   * Throttle duplicate **`logger.warn`** lines per distinct **`req.url`** (ms).
   * @default 12_000
   */
  throttleMs?: number;
  /** Visible copy for the HTML error shell. @default `"en"` */
  locale?: AbeyViteMalformedUriLocale;
};

type ConnectLayer = { route: string; handle: NextHandle };
type NextHandle = (req: IncomingMessage, res: ServerResponse, next: NextFn) => unknown;
type NextFn = (err?: unknown) => void;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Mirrors `viteServeStaticMiddleware` pathname decoding (sirv branch). */
function decodeUrlPathLikeVite(urlRaw: string): void {
  const u = new URL(urlRaw, "http://example.com");
  decodeURI(u.pathname);
}

/** Heuristic: dev bug where **`?inline`** CSS was passed to **`stylesHrefs`** → huge fake “path”. */
function looksLikeEncodedCssPathSnippet(snippet: string): boolean {
  const low = snippet.toLowerCase();
  const hasBrace = low.includes("%7b");
  const classish = /\.[a-z_-][\w-]*/i.test(snippet);
  const customProp = /--/.test(snippet);
  const hasEncodedSpace = low.includes("%20");
  return (hasBrace || customProp || hasEncodedSpace) && classish;
}

function errorPageHtml(snippet: string, locale: AbeyViteMalformedUriLocale): string {
  const t =
    locale === "es"
      ? {
          lang: "es",
          title: "400 · URL mal formada",
          h1: "400 · Secuencia de URI inválida",
          p1: "La ruta pedida tiene <strong>codificación % ilegal</strong> (p. ej. un <code>%</code> suelto o hex incompleto). Vite rechaza internamente con <code>decodeURI</code>.",
          p2: "<strong>Suele venir de</strong>: enlace mal generado en la app, prefetch, la barra de dirección o extensiones del navegador.",
          muted:
            "En dev esta respuesta ya no dispara la traza “URI malformed” en bucle del middleware estático.",
        }
      : {
          lang: "en",
          title: "400 · Malformed URL",
          h1: "400 · Invalid URI escape",
          p1: "This path contains <strong>illegal % encoding</strong> (a lone <code>%</code> or incomplete hex). Vite fails internally in <code>decodeURI</code>.",
          p2: "<strong>Common causes</strong>: a bad SPA link, speculative prefetch, manual address-bar tests, or browser extensions probing the dev server.",
          muted: "In dev this response avoids the repeating “URI malformed” stack trace from Vite’s static middleware.",
        };

  const showAbeyCssHint = looksLikeEncodedCssPathSnippet(snippet);
  const abeyHint =
    locale === "es"
      ? "<strong>AbeyJs</strong>: esta ruta parece <strong>CSS codificado como URL</strong>. Con <strong><code>@AbeyComponent</code></strong>, <code>?inline</code> va en <strong><code>stylesText</code></strong>, no en <strong><code>stylesHrefs</code></strong>. Para un <strong><code>&lt;link&gt;</code></strong> usá <code>?url</code> o <code>new URL(/* … */)</code>. Guía: <strong>/guides/abey-component</strong>."
      : "<strong>AbeyJs:</strong> this path resembles <strong>URL-encoded stylesheet text</strong>. With <strong><code>@AbeyComponent</code></strong>, <code>?inline</code> imports belong in <strong><code>stylesText</code></strong>, not <strong><code>stylesHrefs</code></strong>. For a <strong><code>&lt;link&gt;</code></strong>, use <code>?url</code> or <code>new URL(/* … */)</code>. Doc: <strong>/guides/abey-component</strong>.";

  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t.title}</title>
<style>
  :root{font-family:ui-sans-serif,system-ui,sans-serif;}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c1222;color:#e8edf7;padding:1.5rem;line-height:1.55;}
  .card{max-width:28rem;background:#161f33;border-radius:14px;padding:1.5rem 1.75rem;box-shadow:0 22px 50px rgba(0,0,0,.4);border:1px solid #273552;}
  h1{font-size:1.15rem;font-weight:650;margin:0 0 .5rem;color:#fda4af;}
  p{font-size:.9rem;color:#9fb3d9;margin:.45rem 0;}
  strong{color:#c7dbf7;}
  code{font-size:.9em;}
  pre{margin:1rem 0 0;background:#0a0f18;border-radius:10px;padding:.85rem 1rem;overflow:auto;font-size:.68rem;line-height:1.45;color:#fde68a;border:1px solid #2b3f66;white-space:pre-wrap;word-break:break-all;}
  .hint{margin:.85rem 0 0;font-size:.78rem;color:#c4d5ff;line-height:1.5;background:#252f4a;padding:.75rem 1rem;border-radius:10px;border:1px solid #39507a;}
  .muted{margin-top:.9rem;font-size:.74rem;color:#6b859e;}
</style>
</head>
<body><div class="card">
<h1>${t.h1}</h1>
<p>${t.p1}</p>
<p>${t.p2}</p>
<pre>${escapeHtml(snippet)}</pre>
${showAbeyCssHint ? `<p class="hint">${abeyHint}</p>` : ``}
<p class="muted">${t.muted}</p>
</div></body></html>`;
}

function installGuard(server: ViteDevServer, opts: Required<AbeyViteMalformedUriGuardOptions>): void {
  const { throttleMs, locale } = opts;
  const loggedAt = new Map<string, number>();

  const guard: NextHandle = (req, res, next) => {
    const raw = req.url ?? "";
    if (raw.startsWith("//")) {
      next();
      return;
    }
    try {
      if (raw) {
        decodeUrlPathLikeVite(raw);
      }
    } catch {
      const snippet = raw.length > 180 ? `${raw.slice(0, 180)}…` : raw;
      const now = Date.now();
      const last = loggedAt.get(snippet) ?? 0;
      if (now - last > throttleMs) {
        loggedAt.set(snippet, now);
        const sec = Math.round(throttleMs / 1000);
        const cssHint = looksLikeEncodedCssPathSnippet(snippet)
          ? locale === "es"
            ? "\n  AbeyJs: ¿pusiste texto ?inline en stylesHrefs? Usá stylesText + ?inline o stylesHrefs + ?url (/guides/abey-component).\n"
            : "\n  AbeyJs: did you wire ?inline CSS into stylesHrefs? Use stylesText + ?inline or stylesHrefs + ?url (/guides/abey-component).\n"
          : "";
        const msg =
          locale === "es"
            ? `\n  [abey/vite] URL mal formada — respondiendo 400 (sin Internal Server Error).\n  ${snippet}\n  (Avisos repetidos, como mucho cada ~${sec}s por URL)${cssHint}`
            : `\n  [abey/vite] Malformed request URL — answered 400 (no Internal Server Error).\n  ${snippet}\n  (Repeats throttled to ~${sec}s per distinct URL)${cssHint}`;
        server.config.logger.warn(msg);
      }
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(errorPageHtml(snippet, locale));
      return;
    }
    next();
  };

  const stack = (server.middlewares as typeof server.middlewares & { stack?: ConnectLayer[] }).stack;
  if (!Array.isArray(stack)) {
    server.config.logger.error("[abey-vite-malformed-uri-guard] connect stack unavailable");
    return;
  }
  // Connect `use(fn)` stores `route: ""` (trailing `/` stripped from default mount).
  stack.unshift({ route: "", handle: guard });
}

/**
 * Vite **`configureServer`** hook that runs **before** static middleware: invalid **`%`** sequences
 * are answered with **400 HTML** instead of throwing inside Vite (**`URI malformed`** log spam).
 * Uses **`enforce: "pre"`**; still register early in **`plugins`** for predictable ordering.
 *
 * When the path resembles **encoded CSS**, the terminal warn and HTML page add an **AbeyJs** reminder
 * (`@AbeyComponent`: **`stylesText`** + **`?inline`** vs **`stylesHrefs`** + **`?url`**).
 */
export function abeyViteMalformedUriGuard(options: AbeyViteMalformedUriGuardOptions = {}): Plugin {
  const throttleMs = options.throttleMs ?? 12_000;
  const locale = options.locale ?? "en";

  return {
    name: "abey-vite-malformed-uri-guard",
    enforce: "pre",
    configureServer(server) {
      installGuard(server, { throttleMs, locale });
    },
  };
}
