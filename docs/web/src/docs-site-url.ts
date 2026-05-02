import { normalizeBasename, withBasename } from "@abeyjs/view";

/** Vite **`base`** (e.g. `/` locally, `/AbeyJs/` on GitHub Pages). */
export function docsSiteHref(appPath: string): string {
  const b = normalizeBasename(import.meta.env.BASE_URL ?? "");
  const p = appPath.startsWith("/") ? appPath : `/${appPath}`;
  if (!b) return p === "" ? "/" : p;
  return withBasename(p, b);
}

/** Full browser URL for SPA paths (public welcome has no **`router`**). */
export function docsSiteAssign(appPath: string): void {
  window.location.assign(docsSiteHref(appPath));
}

/** Prefix root-absolute **`href`**s for GitHub **`base`**. Internal doc links only. */
export function rewriteDocsSiteAnchors(root: ParentNode): void {
  const b = normalizeBasename(import.meta.env.BASE_URL ?? "");
  if (!b) return;
  for (const a of root.querySelectorAll<HTMLAnchorElement>("a[href^='/']")) {
    if (a.target === "_blank" || a.hasAttribute("download")) continue;
    const raw = a.getAttribute("href");
    if (!raw || raw.startsWith("//")) continue;
    a.setAttribute("href", docsSiteHref(raw));
  }
}
