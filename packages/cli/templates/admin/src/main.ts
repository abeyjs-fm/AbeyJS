import { bootstrapOmegaApp } from "@abeyjs/view";
import "@abeyjs/view/theme/omega-default.css";
import { createOmega } from "./omegaSetup.js";
import { getRoutes } from "./routes.js";

const app = document.getElementById("app");
if (!app) {
  throw new Error("Falta #app en index.html");
}

const { router, dispose, runtime } = bootstrapOmegaApp(app, {
  createOmega,
  shell: {
    brand: "Lector",
    subBrand: "admin",
    variant: "admin",
    /** `true`: barra tipo dashboard + sidebar + área de contenido. `false` (CLI: --shell appbar) solo app bar mínima + sidebar. */
    dashboardLayout: true,
    logoMark: "Lector.",
    appDocumentTitle: "AbeyJs",
    routes: getRoutes(),
  },
});

void runtime;

if (import.meta.env.DEV) {
  (globalThis as unknown as { __abeyRouter?: unknown }).__abeyRouter = router;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dispose();
  });
}
