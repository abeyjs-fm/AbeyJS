export type ModuleStylesHandle = {
  dispose: () => void;
};

type Entry = { key: string; count: number; el: HTMLLinkElement };

const REGISTRY: Map<string, Entry> = new Map();

function ensureLink(href: string): Entry {
  const key = href.trim();
  const existing = REGISTRY.get(key);
  if (existing) {
    existing.count++;
    // Si el link fue removido (p. ej. por dispose previo), volver a insertarlo.
    if (!existing.el.isConnected) {
      document.head.appendChild(existing.el);
    }
    return existing;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = key;
  link.setAttribute("data-abey-style", "1");
  document.head.appendChild(link);
  const next: Entry = { key, count: 1, el: link };
  REGISTRY.set(key, next);
  return next;
}

/**
 * Loads CSS files (as `<link rel="stylesheet">`) for the lifetime of a mounted module/view.
 * When disposed, reference counts are decremented and unused `<link>` tags are removed.
 *
 * Usage:
 * - `const styles = mountModuleStyles([new URL("./view.css", import.meta.url).href]);`
 * - call `styles.dispose()` when unmounting the view.
 */
export function mountModuleStyles(hrefs: string[]): ModuleStylesHandle {
  const entries: Entry[] = [];
  for (const h of hrefs) {
    if (!h || !String(h).trim()) continue;
    entries.push(ensureLink(String(h)));
  }
  return {
    dispose: () => {
      for (const e of entries) {
        e.count--;
        if (e.count <= 0) {
          e.el.remove();
          REGISTRY.delete(e.key);
        }
      }
    },
  };
}

