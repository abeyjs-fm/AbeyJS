import "/abey-styles.js";
import { bootstrapOmegaApp, fetchSidebarNav, buildRoutesFromApi } from "@abeyjs/view";
import "@abeyjs/view/theme/omega-default.css";
import { createOmega } from "./omegaSetup.js";
import { getRoutes } from "./routes.js";

let disposeRef: (() => void) | undefined;

async function main(): Promise<void> {
  const app = document.getElementById("app");

  if (!app) {
    throw new Error("Falta #app en index.html");
  }

  const base = getRoutes();
  let routes = base;
  const apiItems = await fetchSidebarNav();
  if (apiItems?.length) {
    routes = buildRoutesFromApi(base, apiItems);
  }

  const { router, dispose, runtime } = bootstrapOmegaApp(app, {
    createOmega,
    shell: {
      brand: "AbeyJs",
      subBrand: "Framework",
      variant: "admin",
      dashboardLayout: true,
      logoMark: "AbeyJs.",
      appDocumentTitle: "AbeyJs",
      /** Sidebar: en dev **`/mock-nav.json`**; prod **`GET /api/nav`** con **`{ items: ApiNavItem[] }`**. */
      routes,
    },
  });

  disposeRef = dispose;

  void runtime;

  if (import.meta.env.DEV) {
    (globalThis as unknown as { __abeyRouter?: unknown }).__abeyRouter = router;
  }
}

void main().catch((err) => {
  console.error(err);
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeRef?.();
  });
}
