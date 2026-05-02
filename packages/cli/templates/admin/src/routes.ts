import type { AppRoute, ComponentRouteNav, ComponentRouteSpec, PageRouteNav, PageViewSpec } from "@abeyjs/view";
import { componentRoute, pageRoute } from "@abeyjs/view";

/**
 * Rutas de la app. Ejemplos:
 *
 * - **componentRoute** + **`load()`** — vistas `@AbeyComponent` en chunk lazy (home).
 * - **pageRoute** + **`PageViewSpec`** — pantallas declarativas.
 * - **lazyViewMount** / **`mount` custom** — listados, formularios, etc.
 * - **navChildren** en **`AppRoute`** — submenú lateral en árbol; cada **`path`** hoja debe existir en este mismo array de rutas.
 */
export function getRoutes(): AppRoute[] {
  return [
    componentRoute(
      "/",
      {
        label: "Inicio",
        title: "Inicio",
        navIconFa: "fa-solid fa-house",
      } satisfies ComponentRouteNav,
      {
        selector: "app-admin-home",
        load: (): Promise<typeof import("./views/home/app.home.view.js")> =>
          import("./views/home/app.home.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    pageRoute(
      "/catalogo",
      {
        label: "Catálogo",
        title: "Catálogo",
        navIconFa: "fa-solid fa-folder-tree",
        navChildren: [
          { path: "/catalogo/items", label: "Ítems", navIconFa: "fa-solid fa-list" },
          {
            path: "/catalogo/grupos",
            label: "Grupos",
            navIconFa: "fa-solid fa-layer-group",
            children: [{ path: "/catalogo/grupos/nuevo", label: "Nuevo grupo" }],
          },
        ],
      } satisfies PageRouteNav,
      { heading: "Catálogo", lead: "Vista raíz del catálogo (ejemplo)." },
    ),
    pageRoute(
      "/catalogo/items",
      { label: "", title: "Ítems", showInNav: false } satisfies PageRouteNav,
      { heading: "Ítems", lead: "Listado de ítems (ejemplo)." },
    ),
    pageRoute(
      "/catalogo/grupos",
      { label: "", title: "Grupos", showInNav: false } satisfies PageRouteNav,
      { heading: "Grupos", lead: "Grupos del catálogo (ejemplo)." },
    ),
    pageRoute(
      "/catalogo/grupos/nuevo",
      { label: "", title: "Nuevo grupo", showInNav: false } satisfies PageRouteNav,
      { heading: "Nuevo grupo", lead: "Alta de grupo (ejemplo)." },
    ),
    pageRoute(
      "*",
      { label: "", title: "No encontrada", showInNav: false } satisfies PageRouteNav,
      {
        heading: "404",
        lead: "Esa ruta no existe. Usa el menú lateral.",
      } satisfies PageViewSpec,
    ),
  ];
}
