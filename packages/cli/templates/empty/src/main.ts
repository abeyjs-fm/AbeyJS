import type { OmegaRuntime } from "@abeyjs/runtime";
import "/abey-styles.js";
import { bootstrapOmegaApp } from "@abeyjs/view";
import { createOmega } from "./omegaSetup.js";
import { getRoutes } from "./routes.js";

const app = document.getElementById("app");
if (!app) {
  throw new Error("Falta #app en index.html");
}

const { router, dispose, runtime } = bootstrapOmegaApp(app, {
  createOmega,
  shell: {
    brand: "AbeyJs",
    subBrand: "starter",
    variant: "blank",
    appDocumentTitle: "AbeyJs",
    routes: getRoutes(),
  },
});

void runtime;

const w = globalThis as unknown as { __abeyRuntime?: OmegaRuntime; __abeyDi?: { channel?: unknown } };
if (runtime) {
  w.__abeyRuntime = runtime;
}
w.__abeyDi ??= {};
w.__abeyDi.channel = w.__abeyDi.channel ?? (() => w.__abeyRuntime?.channel);

if (import.meta.env.DEV) {
  (globalThis as unknown as { __abeyRouter?: unknown }).__abeyRouter = router;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dispose();
  });
}
