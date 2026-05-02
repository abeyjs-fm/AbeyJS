import { normalizeBasename, normalizePathname, withBasename } from "./path-router.js";

/**
 * Build a browser pathname **`/<repo>/segment`** when the app mounts under **`pathnameBase`** (same string as **`import.meta.env.BASE_URL`** from **`vite`** `base`).
 * Empty **`baseUrlRaw`** → returns normalized app path (`/guides` etc.).
 */
export function hrefUnderPathnameBase(appPath: string, baseUrlRaw: string): string {
  const b = normalizeBasename(baseUrlRaw);
  const raw = appPath.startsWith("/") ? appPath : `/${appPath}`;
  let p = normalizePathname(raw === "" ? "/" : raw);
  if (!b) return p === "" ? "/" : p;
  return withBasename(p, b);
}

/** True when **`pathname`** already starts at **`pathnameBase`** (avoids doubling **`/Repo/Repo/...`**). */
export function pathIsUnderPathnameBase(absPathname: string, baseUrlRaw: string): boolean {
  const b = normalizeBasename(baseUrlRaw);
  if (!b) return false;
  const p = normalizePathname(absPathname.startsWith("/") ? absPathname : `/${absPathname}`);
  return p === b || p.startsWith(`${b}/`);
}

/** Prefix **`href="/..."`** anchors so full navigation stays under **`pathnameBase`** (shadow / light subtree). */
export function rewriteRootAbsoluteAnchorsForPathnameBase(
  root: ParentNode,
  baseUrlRaw: string,
): void {
  if (!normalizeBasename(baseUrlRaw)) return;
  for (const a of Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href^='/']"))) {
    if (a.target === "_blank" || a.hasAttribute("download")) continue;
    const raw = a.getAttribute("href");
    if (!raw || raw.startsWith("//")) continue;
    if (pathIsUnderPathnameBase(raw, baseUrlRaw)) continue;
    a.setAttribute("href", hrefUnderPathnameBase(raw, baseUrlRaw));
  }
}

/**
 * Root-relative **`href="/panel"` resolves to **`https://host/panel`**, skipping **`pathnameBase`**. **`capture`**‑phase
 * handler rewrites navigations onto **`pathnameBase`**; uses **`pushState`** when **`navigateSpa`** exists.
 */
export function installPathnameBaseAnchorClickGuard(
  baseUrlRaw: string,
  navigateSpa?: ((appPath: string) => void) | null,
): () => void {
  if (typeof window === "undefined") return (): void => {};
  if (!normalizeBasename(baseUrlRaw)) return (): void => {};

  const onClickCapture = (e: MouseEvent): void => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    let anchor: HTMLAnchorElement | undefined;
    for (const node of e.composedPath()) {
      if (node instanceof HTMLAnchorElement) {
        anchor = node;
        break;
      }
    }
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const raw = anchor.getAttribute("href");
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return;
    if (pathIsUnderPathnameBase(raw, baseUrlRaw)) return;

    const appPath = normalizePathname(raw);
    const normalized = appPath === "" ? "/" : appPath;
    if (navigateSpa) {
      if (anchor.origin !== window.location.origin) return;
      e.preventDefault();
      navigateSpa(normalized);
      return;
    }
    if (anchor.origin !== window.location.origin) return;
    e.preventDefault();
    window.location.assign(hrefUnderPathnameBase(normalized, baseUrlRaw));
  };

  document.addEventListener("click", onClickCapture, { capture: true });
  return (): void => document.removeEventListener("click", onClickCapture, { capture: true });
}
