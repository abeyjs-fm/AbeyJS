import {
  hrefUnderPathnameBase,
  installPathnameBaseAnchorClickGuard,
  rewriteRootAbsoluteAnchorsForPathnameBase,
} from "@abeyjs/view";

function docsBaseUrl(): string {
  return import.meta.env.BASE_URL ?? "";
}

/** Vite **`base`** (e.g. `/` locally, **`/AbeyJS/`** on GitHub Pages). */
export function docsSiteHref(appPath: string): string {
  return hrefUnderPathnameBase(appPath, docsBaseUrl());
}

/** Full browser URL for SPA paths (public welcome has no **`router`**). */
export function docsSiteAssign(appPath: string): void {
  window.location.assign(docsSiteHref(appPath));
}

/** Prefix root-absolute **`href`**s for GitHub **`base`**. Internal doc links only. */
export function rewriteDocsSiteAnchors(root: ParentNode): void {
  rewriteRootAbsoluteAnchorsForPathnameBase(root, docsBaseUrl());
}

/**
 * Docs-specific wiring: same **`import.meta.env.BASE_URL`** as **`bootstrapOmegaApp` `pathnameBase`**.
 * @see **`installPathnameBaseAnchorClickGuard`** in **`@abeyjs/view`**.
 */
export function installDocsSiteRootAnchorGuard(
  navigateSpa?: ((appPath: string) => void) | null | undefined,
): () => void {
  return installPathnameBaseAnchorClickGuard(docsBaseUrl(), navigateSpa);
}
