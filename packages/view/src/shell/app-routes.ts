import { normalizePathname } from "../router/path-router.js";

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
  const inNav = routes.find((r) => r.path !== "*" && (r.showInNav !== false) && r.label);
  if (inNav) {
    return normalizePathname(inNav.path) === "" ? "/" : inNav.path.startsWith("/") ? inNav.path : `/${inNav.path}`;
  }
  return "/";
}
