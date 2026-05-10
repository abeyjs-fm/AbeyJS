// --- GENERATED FILE - DO NOT EDIT MANUALLY ---
import { 
  componentRoute, 
  pageRoute, 
  type AppRoute, 
  type ComponentRouteNav, 
  type ComponentRouteSpec,
  type PageRouteNav,
  type PageViewSpec
} from "@abeyjs/view";

export function getRoutes(): AppRoute[] {
  const allDiscoveredRoutes: AppRoute[] = [
    componentRoute(
      "/guides/intro",
      { label: "", title: "Introduction · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-intro", 
        load: () => import("./views/guides/intro/app.doc.intro.view.js")
      }
    ),
    componentRoute(
      "/guides/quick-start",
      { label: "", title: "Quick start · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-quick-start", 
        load: () => import("./views/guides/quick-start/app.doc.quick-start.view.js")
      }
    ),
    componentRoute(
      "/packages/agents",
      { label: "", title: "@abeyjs/agents · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-agents", 
        load: () => import("./views/packages/app.pkg.agents.view.js")
      }
    ),
    componentRoute(
      "/packages/cli",
      { label: "", title: "@abeyjs/cli · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-cli", 
        load: () => import("./views/packages/app.pkg.cli.view.js")
      }
    ),
    componentRoute(
      "/packages/compiler",
      { label: "", title: "@abeyjs/compiler · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-compiler", 
        load: () => import("./views/packages/app.pkg.compiler.view.js")
      }
    ),
    componentRoute(
      "/packages/core",
      { label: "", title: "@abeyjs/core · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-core", 
        load: () => import("./views/packages/app.pkg.core.view.js")
      }
    ),
    componentRoute(
      "/packages/flows",
      { label: "", title: "@abeyjs/flows · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-flows", 
        load: () => import("./views/packages/app.pkg.flows.view.js")
      }
    ),
    componentRoute(
      "/packages/http",
      { label: "", title: "@abeyjs/http · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-http", 
        load: () => import("./views/packages/app.pkg.http.view.js")
      }
    ),
    componentRoute(
      "/packages/inspector",
      { label: "", title: "@abeyjs/inspector · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-inspector", 
        load: () => import("./views/packages/app.pkg.inspector.view.js")
      }
    ),
    componentRoute(
      "/packages/openapi",
      { label: "", title: "@abeyjs/openapi · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-openapi", 
        load: () => import("./views/packages/app.pkg.openapi.view.js")
      }
    ),
    componentRoute(
      "/packages/runtime",
      { label: "", title: "@abeyjs/runtime · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-runtime", 
        load: () => import("./views/packages/app.pkg.runtime.view.js")
      }
    ),
    componentRoute(
      "/packages/state",
      { label: "", title: "@abeyjs/state · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-state", 
        load: () => import("./views/packages/app.pkg.state.view.js")
      }
    ),
    componentRoute(
      "/packages/uikit",
      { label: "", title: "@abeyjs/uikit · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-uikit", 
        load: () => import("./views/packages/app.pkg.uikit.view.js")
      }
    ),
    componentRoute(
      "/packages/validation",
      { label: "", title: "@abeyjs/validation · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-validation", 
        load: () => import("./views/packages/app.pkg.validation.view.js")
      }
    ),
    componentRoute(
      "/packages/view",
      { label: "", title: "@abeyjs/view · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-view", 
        load: () => import("./views/packages/app.pkg.view.view.js")
      }
    ),
    componentRoute(
      "/guides/abey-component",
      { label: "", title: "Abey Component · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-abey-component", 
        load: () => import("./views/guides/abey-component/app.doc.abey-component.view.js")
      }
    ),
    componentRoute(
      "/utils/abey-table",
      { label: "", title: "Abey Table · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-abey-table", 
        load: () => import("./views/utils/abey-table-for-api/ui/app-abey-table.biew.js")
      }
    ),
    componentRoute(
      "/guides/abey-templates",
      { label: "", title: "Abey Templates · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-abey-templates", 
        load: () => import("./views/guides/abey-templates/app.doc.abey-templates.view.js")
      }
    ),
    componentRoute(
      "/guides/bootstrap-shell",
      { label: "", title: "Bootstrap Shell · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-bootstrap-shell", 
        load: () => import("./views/guides/bootstrap-shell/app.doc.bootstrap-shell.view.js")
      }
    ),
    componentRoute(
      "/guides/cli",
      { label: "", title: "Cli · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-cli", 
        load: () => import("./views/guides/cli/app.doc.cli.view.js")
      }
    ),
    componentRoute(
      "/guides/crud-auto",
      { label: "", title: "Crud Auto · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-crud-auto", 
        load: () => import("./views/guides/crud-auto/app.doc.crud-auto.view.js")
      }
    ),
    componentRoute(
      "/guides/data-views",
      { label: "", title: "Data Views · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-data-views", 
        load: () => import("./views/guides/data-views/app.doc.data-views.view.js")
      }
    ),
    componentRoute(
      "/panel",
      { label: "", title: "Documentation · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-docs-home", 
        load: () => import("./views/home/app.docs.home.view.js")
      }
    ),
    componentRoute(
      "/guides/entities-forms",
      { label: "", title: "Entities Forms · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-entities-forms", 
        load: () => import("./views/guides/entities-forms/app.doc.entities-forms.view.js")
      }
    ),
    componentRoute(
      "/guides",
      { label: "", title: "Guides · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-virtual-group", 
        load: () => Promise.resolve({ default: class extends HTMLElement {} })
      }
    ),
    componentRoute(
      "/guides/monorepo",
      { label: "", title: "Monorepo · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-monorepo", 
        load: () => import("./views/guides/monorepo/app.doc.monorepo.view.js")
      }
    ),
    componentRoute(
      "/guides/runtime",
      { label: "", title: "Omega · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-omega", 
        load: () => import("./views/guides/omega/app.doc.omega.view.js")
      }
    ),
    componentRoute(
      "/guides/routing",
      { label: "", title: "Routing · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-routing", 
        load: () => import("./views/guides/routing/app.doc.routing.view.js")
      }
    ),
    componentRoute(
      "/guides/security",
      { label: "", title: "Security · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-security", 
        load: () => import("./views/guides/security/app.doc.security.view.js")
      }
    ),
    componentRoute(
      "/utils/students",
      { label: "", title: "Students · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-students", 
        load: () => import("./views/utils/students/ui/app-students.view.js")
      }
    ),
    componentRoute(
      "/guides/table-flows",
      { label: "", title: "Table Flows · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-table-flows", 
        load: () => import("./views/guides/table-flows/app.doc.table-flows.view.js")
      }
    ),
    componentRoute(
      "/guides/tables",
      { label: "", title: "Tables · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-tables", 
        load: () => import("./views/guides/tables/app.doc.tables.view.js")
      }
    ),
    componentRoute(
      "/packages",
      { label: "", title: "Tools · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-pkg-index", 
        load: () => import("./views/packages/app.pkg.index.view.js")
      }
    ),
    componentRoute(
      "/utils",
      { label: "", title: "Utils · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-utils-index", 
        load: () => import("./views/utils/app.utils.index.view.js")
      }
    ),
    componentRoute(
      "/guides/vision",
      { label: "", title: "Vision · AbeyJs Docs", showInNav: false },
      { 
        selector: "app-doc-vision", 
        load: () => import("./views/guides/vision/app.doc.vision.view.js")
      }
    ),
  ];

  return [
    ...allDiscoveredRoutes,

    // Root-level Navigation Nodes (the ones that show in sidebar)
    componentRoute(
      "/panel",
      { 
        label: "Documentation", 
        title: "Documentation · AbeyJs Docs", 
        showInNav: true, 
        navIconFa: "fa-solid fa-book-open",
      },
      {
        selector: "app-docs-home",
        load: () => import("./views/home/app.docs.home.view.js"),
      }
    ),
    componentRoute(
      "/guides",
      { 
        label: "Guides", 
        title: "Guides · AbeyJs Docs", 
        showInNav: true, 
        navIconFa: "fa-solid fa-folder",
        navChildren: [
          { path: "/guides/intro", label: "Introduction", navIconFa: "fa-solid fa-flag" },
          { path: "/guides/quick-start", label: "Quick start", navIconFa: "fa-solid fa-rocket" },
          { path: "/guides/abey-component", label: "Abey Component", navIconFa: "fa-solid fa-puzzle-piece" },
          { path: "/guides/abey-templates", label: "Abey Templates", navIconFa: "fa-solid fa-file-code" },
          { path: "/guides/bootstrap-shell", label: "Bootstrap Shell", navIconFa: "fa-solid fa-window-maximize" },
          { path: "/guides/cli", label: "Cli", navIconFa: "fa-solid fa-terminal" },
          { path: "/guides/crud-auto", label: "Crud Auto", navIconFa: "fa-solid fa-magic-wand-sparkles" },
          { path: "/guides/data-views", label: "Data Views", navIconFa: "fa-solid fa-database" },
          { path: "/guides/entities-forms", label: "Entities Forms", navIconFa: "fa-solid fa-rectangle-list" },
          { path: "/guides/monorepo", label: "Monorepo", navIconFa: "fa-solid fa-boxes-stacked" },
          { path: "/guides/runtime", label: "Omega", navIconFa: "fa-solid fa-atom" },
          { path: "/guides/routing", label: "Routing", navIconFa: "fa-solid fa-route" },
          { path: "/guides/security", label: "Security", navIconFa: "fa-solid fa-shield-halved" },
          { path: "/guides/table-flows", label: "Table Flows", navIconFa: "fa-solid fa-diagram-next" },
          { path: "/guides/tables", label: "Tables", navIconFa: "fa-solid fa-table" },
          { path: "/guides/vision", label: "Vision", navIconFa: "fa-solid fa-eye" },
        ]
      },
      {
        selector: "app-virtual-group",
        load: () => Promise.resolve({ default: class extends HTMLElement {} }),
      }
    ),
    componentRoute(
      "/packages",
      { 
        label: "Tools", 
        title: "Tools · AbeyJs Docs", 
        showInNav: true, 
        navIconFa: "fa-solid fa-toolbox",
        navChildren: [
          { path: "/packages/agents", label: "@abeyjs/agents", navIconFa: "fa-solid fa-robot" },
          { path: "/packages/cli", label: "@abeyjs/cli", navIconFa: "fa-solid fa-terminal" },
          { path: "/packages/compiler", label: "@abeyjs/compiler", navIconFa: "fa-solid fa-gears" },
          { path: "/packages/core", label: "@abeyjs/core", navIconFa: "fa-solid fa-circle-nodes" },
          { path: "/packages/flows", label: "@abeyjs/flows", navIconFa: "fa-solid fa-diagram-project" },
          { path: "/packages/http", label: "@abeyjs/http", navIconFa: "fa-solid fa-globe" },
          { path: "/packages/inspector", label: "@abeyjs/inspector", navIconFa: "fa-solid fa-magnifying-glass-chart" },
          { path: "/packages/openapi", label: "@abeyjs/openapi", navIconFa: "fa-solid fa-file-code" },
          { path: "/packages/runtime", label: "@abeyjs/runtime", navIconFa: "fa-solid fa-bolt" },
          { path: "/packages/state", label: "@abeyjs/state", navIconFa: "fa-solid fa-wave-square" },
          { path: "/packages/uikit", label: "@abeyjs/uikit", navIconFa: "fa-solid fa-table-cells" },
          { path: "/packages/validation", label: "@abeyjs/validation", navIconFa: "fa-solid fa-check-double" },
          { path: "/packages/view", label: "@abeyjs/view", navIconFa: "fa-solid fa-window-restore" },
        ]
      },
      {
        selector: "app-pkg-index",
        load: () => import("./views/packages/app.pkg.index.view.js"),
      }
    ),
    componentRoute(
      "/utils",
      { 
        label: "Utils", 
        title: "Utils · AbeyJs Docs", 
        showInNav: true, 
        navIconFa: "fa-solid fa-tools",
        navChildren: [
          { path: "/utils/abey-table", label: "Abey Table", navIconFa: "fa-solid fa-table" },
          { path: "/utils/students", label: "Students", navIconFa: "fa-solid fa-graduation-cap" },
        ]
      },
      {
        selector: "app-utils-index",
        load: () => import("./views/utils/app.utils.index.view.js"),
      }
    ),

    pageRoute(
      "*",
      { label: "", title: "Not found", showInNav: false },
      {
        heading: "404",
        lead: "That page does not exist.",
      }
    ),
  ];
}
