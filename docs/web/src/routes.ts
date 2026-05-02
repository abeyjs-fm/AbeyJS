import type {
  AppRoute,
  ComponentRouteNav,
  ComponentRouteSpec,
  PageRouteNav,
  PageViewSpec,
} from "@abeyjs/view";
import { componentRoute, pageRoute } from "@abeyjs/view";
import { getOmegaPkgRoutes } from "./omega-pkg-routes.js";

/** New doc routes: add the same path to `vite-doc-spa-paths.ts` so GitHub Pages serves `…/path/index.html` (HTTP 200). */

/**
 * Sidebar: **Guides** (OM) and **Tools** (`/omega`, one child per `@abeyjs/*` package).
 */
export function getRoutes(): AppRoute[] {
  const navChildren: NonNullable<ComponentRouteNav["navChildren"]> = [
    {
      path: "/guides/intro",
      label: "Introduction",
      navIconFa: "fa-solid fa-flag",
    },
    {
      path: "/guides/quick-start",
      label: "Quick start",
      navIconFa: "fa-solid fa-rocket",
    },
    {
      path: "/guides/bootstrap-shell",
      label: "Bootstrap · shell",
      navIconFa: "fa-solid fa-window-maximize",
    },
    { path: "/guides/routing", label: "Routing", navIconFa: "fa-solid fa-route" },
    {
      path: "/guides/abey-component",
      label: "@AbeyComponent",
      navIconFa: "fa-solid fa-puzzle-piece",
    },
    {
      path: "/guides/data-views",
      label: "Lists · forms",
      navIconFa: "fa-solid fa-table-list",
    },
    {
      path: "/guides/omega",
      label: "Omega runtime",
      navIconFa: "fa-solid fa-bolt",
    },
    {
      path: "/guides/cli",
      label: "CLI abeyjs",
      navIconFa: "fa-solid fa-terminal",
    },
    {
      path: "/guides/monorepo",
      label: "Monorepo · build",
      navIconFa: "fa-solid fa-boxes-stacked",
    },
    {
      path: "/guides/vision",
      label: "Product vision",
      navIconFa: "fa-solid fa-eye",
    },
    {
      path: "/guides/abey-templates",
      label: "OM templates",
      navIconFa: "fa-solid fa-code",
    },
    {
      path: "/guides/crud-auto",
      label: "CRUD OpenAPI",
      navIconFa: "fa-solid fa-plug-circle-bolt",
    },
    {
      path: "/guides/security",
      label: "Security",
      navIconFa: "fa-solid fa-lock",
    },
    {
      path: "/guides/tables",
      label: "abey-table",
      navIconFa: "fa-solid fa-table",
    },
    {
      path: "/guides/table-flows",
      label: "Tables · flows",
      navIconFa: "fa-solid fa-diagram-project",
    },
    {
      path: "/guides/entities-forms",
      label: "Entities · forms",
      navIconFa: "fa-solid fa-cubes",
    },
  ];

  return [
    componentRoute(
      "/panel",
      {
        label: "Documentation",
        title: "Documentation · AbeyJs",
        navIconFa: "fa-solid fa-book-open",
      } satisfies ComponentRouteNav,
      {
        selector: "app-docs-home",
        load: (): Promise<
          typeof import("./views/home/app.docs.home.view.js")
        > => import("./views/home/app.docs.home.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    pageRoute(
      "/guides",
      {
        label: "Guides",
        title: "Guides · AbeyJs Docs",
        navIconFa: "fa-solid fa-layer-group",
        navChildren,
      } satisfies PageRouteNav,
      {
        heading: "Guide index",
        lead: "Written from the framework maintainer’s perspective: what actually exists in the code, explicit limits (e.g. CRUD/OpenAPI without a fantasy DSL), and clear pointers when something only lives in the monorepo. Most pages are generated from Markdown under `/docs/*.md` with `npm run generate:guides-html` (folder `docs/web`).",
        bullets: [
          "Basics 1–4: intro, first project, full shell (options table + menu API), flat routing and navChildren.",
          "5–6: OM components and data-driven mounts. 7–9: Omega, CLI, repo. 10–16: product vision, compiler, pragmatic CRUD, security, tables and entities with decorators.",
        ],
      } satisfies PageViewSpec,
    ),

    ...getOmegaPkgRoutes(),

    componentRoute(
      "/guides/intro",
      {
        label: "",
        title: "Introduction · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-intro",
        load: (): Promise<
          typeof import("./views/guides/intro/app.doc.intro.view.js")
        > => import("./views/guides/intro/app.doc.intro.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/quick-start",
      {
        label: "",
        title: "Quick start · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-quick-start",
        load: (): Promise<
          typeof import("./views/guides/quick-start/app.doc.quick-start.view.js")
        > => import("./views/guides/quick-start/app.doc.quick-start.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/bootstrap-shell",
      {
        label: "",
        title: "Bootstrap · shell · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-bootstrap-shell",
        load: (): Promise<
          typeof import("./views/guides/bootstrap-shell/app.doc.bootstrap-shell.view.js")
        > =>
          import(
            "./views/guides/bootstrap-shell/app.doc.bootstrap-shell.view.js"
          ),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/routing",
      {
        label: "",
        title: "Routing · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-routing",
        load: (): Promise<
          typeof import("./views/guides/routing/app.doc.routing.view.js")
        > => import("./views/guides/routing/app.doc.routing.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/abey-component",
      {
        label: "",
        title: "@AbeyComponent · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-abey-component",
        load: (): Promise<
          typeof import("./views/guides/abey-component/app.doc.abey-component.view.js")
        > =>
          import(
            "./views/guides/abey-component/app.doc.abey-component.view.js"
          ),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/data-views",
      {
        label: "",
        title: "Lists and forms · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-data-views",
        load: (): Promise<
          typeof import("./views/guides/data-views/app.doc.data-views.view.js")
        > => import("./views/guides/data-views/app.doc.data-views.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/omega",
      {
        label: "",
        title: "Omega overview · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-omega",
        load: (): Promise<
          typeof import("./views/guides/omega/app.doc.omega.view.js")
        > => import("./views/guides/omega/app.doc.omega.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/cli",
      {
        label: "",
        title: "CLI · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-cli",
        load: (): Promise<
          typeof import("./views/guides/cli/app.doc.cli.view.js")
        > => import("./views/guides/cli/app.doc.cli.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/monorepo",
      {
        label: "",
        title: "Monorepo · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-monorepo",
        load: (): Promise<
          typeof import("./views/guides/monorepo/app.doc.monorepo.view.js")
        > => import("./views/guides/monorepo/app.doc.monorepo.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/vision",
      {
        label: "",
        title: "Product vision · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-vision",
        load: (): Promise<
          typeof import("./views/guides/vision/app.doc.vision.view.js")
        > => import("./views/guides/vision/app.doc.vision.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/abey-templates",
      {
        label: "",
        title: "Abey Templates · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-abey-templates",
        load: (): Promise<
          typeof import("./views/guides/abey-templates/app.doc.abey-templates.view.js")
        > =>
          import(
            "./views/guides/abey-templates/app.doc.abey-templates.view.js"
          ),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/crud-auto",
      {
        label: "",
        title: "Automatic CRUD · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-crud-auto",
        load: (): Promise<
          typeof import("./views/guides/crud-auto/app.doc.crud-auto.view.js")
        > => import("./views/guides/crud-auto/app.doc.crud-auto.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/security",
      {
        label: "",
        title: "Security · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-security",
        load: (): Promise<
          typeof import("./views/guides/security/app.doc.security.view.js")
        > => import("./views/guides/security/app.doc.security.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/tables",
      {
        label: "",
        title: "abey-table · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-tables",
        load: (): Promise<
          typeof import("./views/guides/tables/app.doc.tables.view.js")
        > => import("./views/guides/tables/app.doc.tables.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/table-flows",
      {
        label: "",
        title: "abey-table flows · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-table-flows",
        load: (): Promise<
          typeof import("./views/guides/table-flows/app.doc.table-flows.view.js")
        > => import("./views/guides/table-flows/app.doc.table-flows.view.js"),
      } satisfies ComponentRouteSpec,
    ),
    componentRoute(
      "/guides/entities-forms",
      {
        label: "",
        title: "Entities and forms · AbeyJs Docs",
        showInNav: false,
      } satisfies ComponentRouteNav,
      {
        selector: "app-doc-entities-forms",
        load: (): Promise<
          typeof import("./views/guides/entities-forms/app.doc.entities-forms.view.js")
        > =>
          import(
            "./views/guides/entities-forms/app.doc.entities-forms.view.js"
          ),
      } satisfies ComponentRouteSpec,
    ),

    pageRoute(
      "*",
      {
        label: "",
        title: "Not found",
        showInNav: false,
      } satisfies PageRouteNav,
      {
        heading: "404",
        lead: "That page does not exist. Open **Guides** or **Tools** (each @abeyjs/* has its own doc), or go back to **Home**.",
      } satisfies PageViewSpec,
    ),
  ];
}
