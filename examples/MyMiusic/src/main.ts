import "/abey-styles.js";
import { bootstrapOmegaApp, registerAbeyJsUi } from "@abeyjs/view";
import "@abeyjs/view/theme/omega-default.css";
import { createOmega } from "./omegaSetup.js";
import { getRoutes } from "./routes.js";

registerAbeyJsUi();

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

// Exponer runtime para vistas lazy que necesiten dispatch/flow sin acoplar la firma mount(outlet).
(globalThis as unknown as { __abeyRuntime?: unknown }).__abeyRuntime = runtime;

// DOM-DI defaults (para poder hacer: `injectFromDom("channel", el)` / `<abey-provide token="channel" ...>`).
// No acopla el componente a `__abeyRuntime`: el provider resuelve el channel cuando el runtime ya existe.
(globalThis as any).__abeyDi = (globalThis as any).__abeyDi ?? {};
(globalThis as any).__abeyDi.channel =
  (globalThis as any).__abeyDi.channel ??
  (() => (globalThis as any).__abeyRuntime?.channel);

if (import.meta.env.DEV) {
  (globalThis as unknown as { __abeyRouter?: unknown }).__abeyRouter = router;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dispose();
  });
}
