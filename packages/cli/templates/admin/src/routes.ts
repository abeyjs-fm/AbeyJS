import type { AppRoute } from "@abeyjs/view";
import { pageRoute } from "@abeyjs/view";
import { mountHome } from "./home/home.js";

/**
 * Rutas de la app. Tres formas (híbrido, a tu gusto):
 *
 * 1) **pageRoute** + `PageViewSpec` — poca línea, datos → pantalla.
 * 2) **Vista en otro archivo** — `lazyViewMount(() => import("…"), "export")` para no inflar el primer paquete JS.
 * 3) **Control total** — `mount(outlet) { … }` y, si aplica, `mountListViewSync` / `mountFormView`.
 */
export function getRoutes(): AppRoute[] {
  return [
    {
      path: "/",
      label: "Inicio",
      title: "Inicio",
      navIconFa: "fa-solid fa-house",
      mount: mountHome,
    },
    pageRoute(
      "*",
      { label: "", title: "No encontrada", showInNav: false },
      {
        heading: "404",
        lead: "Esa ruta no existe. Usa el menú lateral.",
      },
    ),
  ];
}
