import type { AppRoute } from "@abeyjs/view";
import { componentRoute, pageRoute } from "@abeyjs/view";
import { mountCompilerTest } from "./compiler-test.js";

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
      path: "/compiler-test",
      label: "Compiler",
      title: "Compiler test",
      navIconFa: "fa-solid fa-wrench",
      mount: mountCompilerTest,
    },
    componentRoute(
      "/alumnos-compiler",
      { label: "Alumnos (compiler)", title: "Alumnos (compiler)", navIconFa: "fa-solid fa-flask" },
      { selector: "app-alumnos-compiler", load: () => import("./ecosystems/alumnos/ui/app-alumnos-compiler.view.html") },
    ),
    componentRoute(
      "/music",
      { label: "Music", title: "Music", navIconFa: "fa-solid fa-cube" },
      { selector: "app-music", load: () => import("./ecosystems/music/ui/app-music.js") },
    ),
    componentRoute(
      "/artist",
      { label: "Artist", title: "Artist", navIconFa: "fa-solid fa-cube" },
      { selector: "app-artist", load: () => import("./ecosystems/artist/ui/app-artist.js") },
    ),
    componentRoute(
      "/alumnos",
      { label: "Alumnos", title: "Alumnos", navIconFa: "fa-solid fa-user-graduate" },
      { selector: "app-alumnos", load: () => import("./ecosystems/alumnos/ui/app-alumnos.js") },
    ),
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
