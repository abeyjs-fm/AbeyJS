import type { ViewTheme } from "../form-types.js";

const ABEYJS_VIEW_BASE_CLASS = "abey" as const;

const splitClasses = (s: string | undefined): string[] =>
  (s ?? "")
    .split(/\s+/)
    .map((c) => c.trim())
    .filter(Boolean);

export function applyViewTheme(el: HTMLElement, theme: ViewTheme | undefined, block: string): void {
  el.classList.add(ABEYJS_VIEW_BASE_CLASS, block, ...splitClasses(theme?.className));
  if (theme?.vars) {
    for (const [k, v] of Object.entries(theme.vars)) {
      if (v !== undefined) {
        el.style.setProperty(k, v);
      }
    }
  }
}
