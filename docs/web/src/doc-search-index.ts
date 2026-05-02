import type { AppRoute, AppRouteNavChild } from "@abeyjs/view";
import { normalizePathname } from "@abeyjs/view";
import { getRoutes } from "./routes.js";

export type DocSearchItem = {
  href: string;
  title: string;
  hint?: string;
};

function normHref(p: string): string | null {
  const raw = String(p ?? "").trim();
  if (!raw || raw === "*") return null;
  const h = normalizePathname(raw.startsWith("/") ? raw : `/${raw}`);
  return h || null;
}

function walkNavChildren(
  nodes: readonly AppRouteNavChild[] | undefined,
  extras: Map<string, string>,
): void {
  if (!nodes?.length) return;
  for (const n of nodes) {
    const href = normHref(n.path);
    if (href) {
      const cur = extras.get(href);
      extras.set(href, cur ? `${cur} ${n.label}`.trim() : n.label);
    }
    if (n.children?.length) walkNavChildren(n.children, extras);
  }
}

/**
 * Flat list of navigable entries (shell routes + nav labels).
 */
export function buildDocSearchIndex(routes: readonly AppRoute[]): DocSearchItem[] {
  const navHints = new Map<string, string>();
  for (const r of routes) {
    walkNavChildren(r.navChildren, navHints);
  }

  const byHref = new Map<string, DocSearchItem>();

  for (const r of routes) {
    const href = normHref(r.path);
    if (!href) continue;

    const t = String(r.title ?? "").trim() || String(r.label ?? "").trim();
    const hintRaw = navHints.get(href);
    const hint = hintRaw && hintRaw !== t ? hintRaw : undefined;

    const next: DocSearchItem = hint ? { href, title: t, hint } : { href, title: t };

    const prev = byHref.get(href);
    if (!prev || next.title.length > prev.title.length) {
      byHref.set(href, next);
    }
  }

  return Array.from(byHref.values()).sort((a, b) => a.href.localeCompare(b.href));
}

let cachedCatalog: DocSearchItem[] | null = null;

/** Memoized index (built from **`getRoutes()`** once per load). */
export function getDocSearchCatalog(): DocSearchItem[] {
  cachedCatalog ??= buildDocSearchIndex(getRoutes());
  return cachedCatalog;
}

function fold(s: string): string {
  return s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Simple matching on title + path + hint; returns the top `limit` entries. */
export function searchDocItems(items: readonly DocSearchItem[], queryRaw: string, limit = 8): DocSearchItem[] {
  const q = fold(queryRaw.trim());
  if (q.length < 1) return [];

  const terms = [...new Set(q.split(/\s+/).filter(Boolean))];
  const scored = items.map((it) => {
    const hay = fold(`${it.title} ${it.hint ?? ""} ${it.href.replace(/-/g, " ")}`);
    let score = 0;
    for (const t of terms) {
      if (!t) continue;
      if (!hay.includes(t)) return { item: it, score: -1 };
      let w = Math.min(t.length, 14);
      if (fold(it.title).includes(t)) w += 6;
      if (fold(it.href).includes(t)) w += 2;
      score += w;
    }
    return { item: it, score };
  });

  return scored
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((x) => x.item);
}
