import type { AppRoute, ComponentRouteNav, ComponentRouteSpec, PageRouteNav, PageViewSpec } from "@abeyjs/view";
import { componentRoute, pageRoute } from "@abeyjs/view";

export function getRoutes(): AppRoute[] {
  return [
    componentRoute(
      "/",
      { label: "Home", title: "Welcome" } satisfies ComponentRouteNav,
      {
        selector: "app-home-view",
        load: (): Promise<typeof import("./views/home/app.home.view.js")> =>
          import("./views/home/app.home.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    pageRoute(
      "*",
      { label: "", title: "404", showInNav: false } satisfies PageRouteNav,
      { heading: "404", lead: "Ruta no encontrada." } satisfies PageViewSpec,
    ),
  ];
}
