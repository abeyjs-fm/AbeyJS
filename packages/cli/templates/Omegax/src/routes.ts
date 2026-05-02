import type { AppRoute } from "@abeyjs/view";
import { componentRoute, pageRoute } from "@abeyjs/view";

export function getRoutes(): AppRoute[] {
  return [
    componentRoute(
      "/",
      { label: "Home", title: "Welcome" },
      { selector: "app-home-view", load: () => import("./views/home/app.home.view.js") },
    ),
    pageRoute(
      "*",
      { label: "", title: "404", showInNav: false },
      { heading: "404", lead: "Ruta no encontrada." },
    ),
  ];
}
