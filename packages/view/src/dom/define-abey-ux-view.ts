import { createTemplateView, type TemplateView } from "./template-view.js";
import { mountModuleStyles, type ModuleStylesHandle } from "./mount-module-styles.js";

export type AbeyUxViewMeta = {
  /** Raw HTML template (usually `import x from "./view.html?raw"`). */
  template: string;
  /**
   * CSS paths relative to `baseUrl` (usually `["./view.css"]`).
   * Prefer `stylesHrefs` when using Vite (`import x from "./view.css?url"`).
   */
  styles?: string[];
  /** Pre-resolved stylesheet hrefs (recommended). */
  stylesHrefs?: string[];
  /** `import.meta.url` of the calling module (used to resolve `styles`). */
  baseUrl?: string;
};

export type AbeyUxViewInitCtx = {
  view: TemplateView;
  styles: ModuleStylesHandle;
};

/**
 * Small "module metadata" helper (Angular-like) without decorators.
 * It resolves module-local styles, creates a `TemplateView`, and passes both to your mount function.
 */
export function defineAbeyUxView(
  meta: AbeyUxViewMeta,
  mount: (outlet: HTMLElement, ctx: AbeyUxViewInitCtx) => void | (() => void),
): (outlet: HTMLElement) => void | (() => void);

export function defineAbeyUxView(
  template: string,
  baseUrlOrStylesHrefs: string | string[],
  styles: string[] | undefined,
  mount: (outlet: HTMLElement, ctx: AbeyUxViewInitCtx) => void | (() => void),
): (outlet: HTMLElement) => void | (() => void);

export function defineAbeyUxView(
  template: string,
  stylesHrefs: string[],
  mount: (outlet: HTMLElement, ctx: AbeyUxViewInitCtx) => void | (() => void),
): (outlet: HTMLElement) => void | (() => void);

export function defineAbeyUxView(
  a: AbeyUxViewMeta | string,
  b:
    | ((outlet: HTMLElement, ctx: AbeyUxViewInitCtx) => void | (() => void))
    | string
    | string[],
  c?: string[] | ((outlet: HTMLElement, ctx: AbeyUxViewInitCtx) => void | (() => void)) | undefined,
  d?: (outlet: HTMLElement, ctx: AbeyUxViewInitCtx) => void | (() => void),
): (outlet: HTMLElement) => void | (() => void) {
  const meta: AbeyUxViewMeta = (() => {
    if (typeof a !== "string") return a;
    if (Array.isArray(b) && typeof c === "function") {
      // (template, stylesHrefs, mount)
      return { template: a, stylesHrefs: b };
    }
    if (Array.isArray(b)) {
      // (template, stylesHrefs, styles?, mount)
      return { template: a, stylesHrefs: b, styles: c as string[] | undefined };
    }
    // (template, baseUrl, styles?, mount)
    return { template: a, baseUrl: String(b), styles: c as string[] | undefined };
  })();

  const mount = (typeof a === "string"
    ? (typeof c === "function" ? c : d)
    : b) as (outlet: HTMLElement, ctx: AbeyUxViewInitCtx) => void | (() => void);

  const view = createTemplateView(meta.template);
  const styleHrefs = [
    ...(meta.stylesHrefs ?? []).map((h) => String(h)),
    ...(meta.styles ?? []).map((p) => (meta.baseUrl ? new URL(p, meta.baseUrl).href : String(p))),
  ].filter((x) => x && x.trim());
  return (outlet) => {
    const styles = mountModuleStyles(styleHrefs);
    const cleanup = mount(outlet, { view, styles });
    return () => {
      try {
        (typeof cleanup === "function" ? cleanup : undefined)?.();
      } finally {
        styles.dispose();
      }
    };
  };
}

