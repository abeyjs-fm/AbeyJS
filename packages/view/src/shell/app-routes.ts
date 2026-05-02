import { normalizePathname } from "../router/path-router.js";

/**
 * Entrada anidada del menú lateral (**admin** / dashboard). Cada **`path`** debe existir
 * en la misma tabla de **`AppRoute`** para que **`matchAppRoute`** resuelva la vista.
 */
export type AppRouteNavChild = {
  path: string;
  label: string;
  navIcon?: string;
  navIconFa?: string;
  children?: AppRouteNavChild[];
};

/**
 * Ruta con vista montada en el *outlet* del shell. Orden: rutas concretas primero,
 * la de respaldo con `path: "*"` (404) al final, si aplica.
 */
export type AppRoute = {
  /** Ruta normalizada; usa `"*"` para coincidir cuando ninguna otra aplica. */
  path: string;
  /** Texto en sidebar / barra; usa `""` y `showInNav: false` para “oculta”. */
  label: string;
  title: string;
  /** Por defecto `true`; pon `false` en páginas solo por URL profunda, etc. */
  showInNav?: boolean;
  /**
   * Subárbol en el sidebar (**admin**): se renderiza como grupo desplegable (`<details>`).
   * Las hojas deben repetir **`path`** de rutas ya declaradas en el array principal.
   */
  navChildren?: AppRouteNavChild[];
  /**
   * Monta la pantalla. Devuelve opcionalmente un `dispose` al salir de la ruta
   * (p. ej. bajar suscripciones).
   */
  mount: (outlet: HTMLElement) => void | (() => void);
  /** Un carácter o emoji junto al label en el menú lateral (plantilla “dashboard”). */
  navIcon?: string;
  /**
   * Icono Font Awesome 6 (clases en el `<i>`, p. ej. `fa-solid fa-house`).
   * Si está definido, sustituye a `navIcon` en el menú. Cargar el CSS de FA (p. ej. en `index.html`).
   */
  navIconFa?: string;
};

function firstLeafFromNavChild(c: AppRouteNavChild): string | null {
  if (c.children?.length) {
    for (const x of c.children) {
      const p = firstLeafFromNavChild(x);
      if (p) return p;
    }
  }
  const raw = String(c.path ?? "").trim();
  if (!raw) return null;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function firstLeafFromRoute(r: AppRoute): string | null {
  if (r.path === "*" || r.showInNav === false || !r.label.trim()) return null;
  if (r.navChildren?.length) {
    for (const c of r.navChildren) {
      const p = firstLeafFromNavChild(c);
      if (p) return p;
    }
  }
  const raw = r.path.trim();
  if (!raw) return null;
  return normalizePathname(raw) === "" ? "/" : raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Resuelve la ruta activa. Coincidencia exacta por `path` (normalizado); al final,
 * se comprueba el comodín `*`.
 */
export function matchAppRoute(path: string, routes: AppRoute[]): AppRoute | null {
  const p = normalizePathname(path);
  for (const r of routes) {
    if (r.path === "*") {
      continue;
    }
    if (normalizePathname(r.path) === p) {
      return r;
    }
  }
  return routes.find((r) => r.path === "*") ?? null;
}

export function firstNavPath(routes: AppRoute[]): string {
  for (const r of routes) {
    const p = firstLeafFromRoute(r);
    if (p) {
      return normalizePathname(p) === "" ? "/" : p.startsWith("/") ? p : `/${p}`;
    }
  }
  return "/";
}
