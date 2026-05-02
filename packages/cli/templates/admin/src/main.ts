import type { OmegaRuntime } from "@abeyjs/runtime";
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
      /** Sidebar desde **`fetchSidebarNav`**: dev **`public/mock-nav.json`**; prod **`GET /api/nav`** (`{ items }`). Opciones: **`fetchSidebarNav({ preferMockFetch, mockUrl, apiUrl })`**. */
      routes,
      // App bar:`appBarActions` sustituye la demo (`[]` = solo tema). `appBarActionsAppend` concatena después.
      // Menú cuenta: `{ ariaLabel, iconFa?, avatarSrc?, dropdownMenu: [{ label, iconFa?, href?, onClick? }] }`.
      // Ej.: appBarActions: [{ ariaLabel: "Cuenta", iconFa: "fa-regular fa-circle-user",
      //   dropdownMenu: [{ label: "Ajustes", iconFa: "fa-regular fa-gear", href: "/config" }] }],
    },
  });

  disposeRef = dispose;

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
}

void main().catch((err) => {
  console.error(err);
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeRef?.();
  });
}
