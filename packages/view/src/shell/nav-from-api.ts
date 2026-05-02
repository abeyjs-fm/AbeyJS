import type { AppRoute, AppRouteNavChild } from "./app-routes.js";

/**
 * Entrada típica de **`GET /api/nav`** o mock **`*.json`**:
 * rutas conocidas por el cliente; texto e iconos del sidebar desde backend.
 */
export type ApiNavItem = {
  path: string;
  label: string;
  navIconFa?: string;
  children?: ApiNavItem[];
};

export type FetchSidebarNavOptions = {
  /**
   * Si **`true`**, **`fetch`** **`mockUrl`** (p. ej. **`public/mock-nav.json`** en Vite).
   * Por defecto se infiere con **`import.meta.env.DEV`** / **`MODE === "development"`** cuando el bundler lo define.
   */
  preferMockFetch?: boolean;
  mockUrl?: string;
  apiUrl?: string;
  /** Retardo tras mock OK (**ms**). Default **100** con mock inferido/dev. **0** en prod/API. */
  mockDelayMs?: number;
};

function inferPreferMockFetch(): boolean {
  try {
    const env = (import.meta as { env?: { DEV?: boolean; MODE?: string } }).env;
    if (typeof env?.DEV === "boolean") {
      return env.DEV;
    }
    return env?.MODE === "development";
  } catch {
    return false;
  }
}

function normPath(raw: string): string {
  const s = String(raw ?? "").trim();
  if (s === "*" || s === "") {
    return s;
  }
  return s.startsWith("/") ? s : `/${s}`;
}

function toNavChild(n: ApiNavItem): AppRouteNavChild {
  const path = normPath(n.path);
  const o: AppRouteNavChild = { path, label: n.label };
  if (n.navIconFa) {
    o.navIconFa = n.navIconFa;
  }
  if (n.children?.length) {
    o.children = n.children.map(toNavChild);
  }
  return o;
}

/** Une rutas con **`mount`** del registro con el árbol de la API (orden y contenido visible del sidebar). */
export function buildRoutesFromApi(base: AppRoute[], apiRoots: ApiNavItem[]): AppRoute[] {
  const routeMap = new Map(base.map((r) => [r.path, r] as const));
  const asterisk = base.find((r) => r.path === "*");

  const roots: AppRoute[] = [];
  const usedRootPaths = new Set<string>();

  for (const node of apiRoots) {
    const path = normPath(node.path);
    const orig = routeMap.get(path);
    if (!orig) {
      continue;
    }
    usedRootPaths.add(path);

    const kids = node.children?.length ? node.children.map(toNavChild) : orig.navChildren;
    const next: AppRoute = {
      ...orig,
      label: node.label,
      showInNav: true,
      navChildren: kids,
    };
    if (node.navIconFa) {
      next.navIconFa = node.navIconFa;
    }
    roots.push(next);
  }

  const rest = base.filter((r) => r.path !== "*" && !usedRootPaths.has(r.path));
  return [...roots, ...rest, ...(asterisk ? [asterisk] : [])];
}

async function parseNavItemsPayload(res: Response): Promise<ApiNavItem[] | null> {
  const data = (await res.json()) as { items?: ApiNavItem[] };
  const items = data.items?.filter((x) => x?.path && x.label) ?? [];
  return items.length ? items : null;
}

/**
 * Sidebar desde red antes del **`bootstrap`**: mock en desarrollo (**`/mock-nav.json`** por defecto),
 * **`GET /api/nav`** (**`credentials: 'include'`**) en otros casos. Si algo falla, **`null`** (usar rutas sólo código).
 */
export async function fetchSidebarNav(options?: FetchSidebarNavOptions): Promise<ApiNavItem[] | null> {
  const preferMock = options?.preferMockFetch ?? inferPreferMockFetch();
  const mockUrl = options?.mockUrl ?? "/mock-nav.json";
  const apiUrl = options?.apiUrl ?? "/api/nav";
  const explicitDelayMs = options?.mockDelayMs;
  const mockDelayMs = explicitDelayMs !== undefined ? explicitDelayMs : preferMock ? 100 : 0;

  try {
    if (preferMock && mockUrl) {
      const res = await fetch(mockUrl, { cache: "no-store" });
      if (!res.ok) {
        return null;
      }
      if (mockDelayMs > 0) {
        await new Promise<void>((r) => {
          window.setTimeout(r, mockDelayMs);
        });
      }
      return parseNavItemsPayload(res);
    }

    const res = await fetch(apiUrl, { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      return null;
    }
    return parseNavItemsPayload(res);
  } catch {
    return null;
  }
}
