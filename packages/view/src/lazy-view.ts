/**
 * **`import()`**-backed route mount — splits heavy screens into their own chunk (typical **Vite** setup).
 */
export function lazyViewMount(
  importFn: () => Promise<Record<string, (outlet: HTMLElement) => void | (() => void)>>,
  /** ESM export name hosting **`(outlet) => void`** (e.g. **`mountPanel`**). */
  exportName: string,
  options?: { showLoadingText?: string },
): (outlet: HTMLElement) => void | (() => void) {
  const loadHint = options?.showLoadingText ?? "Loading…";
  return (outlet) => {
    let disposed = false;
    let innerCleanup: void | (() => void) = undefined;

    outlet.textContent = "";
    const loading = document.createElement("p");
    loading.className = "abey-starter-footnote";
    loading.setAttribute("role", "status");
    loading.textContent = loadHint;
    outlet.appendChild(loading);
    void importFn()
      .then((mod) => {
        if (disposed) return;
        const fn = mod[exportName] as (o: HTMLElement) => void;
        if (typeof fn !== "function") {
          throw new Error(`@abeyjs/view lazyViewMount: falta la export “${exportName}”.`);
        }
        outlet.textContent = "";
        innerCleanup = fn(outlet);
      })
      .catch((err: unknown) => {
        if (disposed) return;
        outlet.textContent = "";
        const p = document.createElement("p");
        p.setAttribute("role", "alert");
        p.className = "abey-starter-footnote";
        p.textContent = err instanceof Error ? err.message : "Failed to load view.";
        outlet.appendChild(p);
      });

    return () => {
      disposed = true;
      try {
        (typeof innerCleanup === "function" ? innerCleanup : undefined)?.();
      } catch {
        /* */
      }
    };
  };
}
