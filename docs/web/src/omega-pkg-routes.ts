import { pageRoute, type AppRoute, type PageRouteNav, type PageViewSpec } from "@abeyjs/view";

type OmegaPkgMeta = {
  slug: string;
  npm: string;
  iconFa: string;
  title: string;
  spec: PageViewSpec;
};

const PKGS: OmegaPkgMeta[] = [
  {
    slug: "core",
    npm: "@abeyjs/core",
    iconFa: "fa-solid fa-circle-nodes",
    title: "@abeyjs/core",
    spec: {
      heading: "@abeyjs/core",
      cardTitle: "Omega bus primitives",
      lead:
        "Lowest layer, no UI: nominal intents (`intentOf`), coherent event/agent/flow naming (`omegaIntentName*`), pub/sub channel (`createChannel`), correlation (`createCorrelationId`), and failure types (`OmegaFailure`). Almost every package depends on this transitively so the browser speaks one language.",
      bullets: [
        "Install: npm install @abeyjs/core. Code: packages/core in the AbeyJs monorepo.",
        "`intentOf` + `OmegaIntent`: type-discriminated messages the runtime dispatches to handlers registered by plugins or modules.",
        "`createChannel`: event bus with namespaces (`CH_HTTP_REQUEST`, intents handled/failed from flows, etc.).",
        "`omegaIntentNameDottedCamel` / `omegaEventName*` + wire names: the same naming contract across URL, server, and client.",
        "`OmegaTypedIntent` / `OmegaTypedEvent`: if you have enums or an intent catalogue, tighten types before the shell.",
        "No DOM or routes—that lives in `@abeyjs/view`. Observable single-slot state lives in `@abeyjs/state`, not here.",
        "Read the header of packages/core/src/index.ts and README.md for the full export map without guessing.",
      ],
      footnote:
        "Guides: Introduction (/guides/intro), Omega runtime (/guides/omega). Prefer `intentOf` over ad-hoc intent strings in the UI.",
    },
  },
  {
    slug: "runtime",
    npm: "@abeyjs/runtime",
    iconFa: "fa-solid fa-bolt",
    title: "@abeyjs/runtime",
    spec: {
      heading: "@abeyjs/runtime",
      cardTitle: "createOmegaRuntime and the browser process",
      lead:
        "Typical single `OmegaRuntime` instance: combines `@abeyjs/core` + `@abeyjs/flows` (OmegaFlowManager, intent pipeline, tracing), optional lightweight container (`OmegaContainer`, omegaToken), and URL/history ↔ intent bridging (`url-bridge`). Anything that lives for the SPA session (registered agents, plugin install/dispose) goes through here after omegaSetup.ts.",
      bullets: [
        "Install: npm install @abeyjs/runtime. Code: packages/runtime. Entry points: createOmegaRuntime, OmegaRuntime.",
        "`OmegaPlugin` / `OmegaModule`: extend lifecycle without touching views; ordered teardown when the user leaves or on unload.",
        "CRUD-friendly HTTP client and OpenAPI discovery live in other packages; the runtime only executes intents those register.",
        "`intentFromQuery`, `startUrlIntentSync`, `setPath`: deep-linking and address-bar sync without a second ad-hoc router.",
        "Flows emit received/handled/failed intents (CHANNEL_INTENT_* in @abeyjs/flows) you can watch in inspector or traces.",
        "One omegaSetup.ts per app: register handlers, openapi cruds, theme, then bootstrapOmegaApp wires view + a ready runtime.",
      ],
      footnote:
        "Guide: Omega (/guides/omega). Even if you only touch views, knowing dispatch vs channel helps debug “my intent never arrives”.",
    },
  },
  {
    slug: "state",
    npm: "@abeyjs/state",
    iconFa: "fa-solid fa-wave-square",
    title: "@abeyjs/state",
    spec: {
      heading: "@abeyjs/state",
      cardTitle: "StateCell as an observable slice",
      lead:
        "`StateCell<T>` is a single-slot observable for sharing a snapshot between OM views (`mountListView*` / signal mounts) and domain code without imposing React/Vue. Pair it with runtime intents for effects when the outside world changes.",
      bullets: [
        "Install: npm install @abeyjs/state. Main export: StateCell from packages/state.",
        "Good for saved filter, selected item, screen drafts before firing a save intent.",
        "`@abeyjs/view` re-exports routes but granular state is your call: cell vs OmegaStatefulAgent by responsibility.",
        "Not one huge immutable tree: if you need many normalized caches, wrap other stores and expose a focused cell for OM.",
        "Onboarding: read the package README (subscribe semantics, shallow equality).",
        "OpenAPI/agents can write current-list cells after each HTTP so the table redraws without the view calling APIs.",
      ],
      footnote:
        "Guides: Omega (/guides/omega), Lists / forms data-driven (/guides/data-views). `@abeyjs/view` depends on state transitively for integrations.",
    },
  },
  {
    slug: "view",
    npm: "@abeyjs/view",
    iconFa: "fa-solid fa-window-restore",
    title: "@abeyjs/view",
    spec: {
      heading: "@abeyjs/view",
      cardTitle: "Shell, flat routes, and OM mounts",
      lead:
        "DOM view layer: app bootstrap (`bootstrapOmegaApp`), MountRoutedAppConfig (admin/landing/blank chrome), flat `AppRoute` table with `componentRoute` and **declarative `pageRoute`**, menu from API (`fetchSidebarNav`, `buildRoutesFromApi`), `defineAbeyComponent`, list/form mounts, and safe HTML helpers. Also ships `@abeyjs/view/theme/omega-default.css` and optional dev `@abeyjs/view/dev/vite-logger`.",
      bullets: [
        "Typical peer: zod (^3.x) because forms and OpenAPI share schemas. Install: npm install @abeyjs/view zod@^3.24.",
        "`mountRoutedApp` + outlets: browser history + shell with sidebar/header without an extra framework.",
        "`PathRouter`: path normalization and match against the table from your getRoutes().",
        "Data-driven: mountListView, mountFormView, text/link mounts with escaping by default; `setSanitizedHtml` only where you control trusted HTML.",
        "`registerAbeyJsUi()` must run before OM routes that include abey-* tags (delegate to @abeyjs/uikit typically).",
        "`inject`, `injectFromDom`, AbeyProvideElement: DI via DOM subtree for mocks and local view tests without a new global singleton.",
        "Detailed exports at the top of packages/view/src/index.ts; follow that before repeating wrappers per app.",
      ],
      footnote:
        "Guides: Bootstrap / shell (/guides/bootstrap-shell), Routing (/guides/routing), @AbeyComponent (/guides/abey-component), Lists (/guides/data-views).",
    },
  },
  {
    slug: "compiler",
    npm: "@abeyjs/compiler",
    iconFa: "fa-solid fa-gears",
    title: "@abeyjs/compiler",
    spec: {
      heading: "@abeyjs/compiler",
      cardTitle: "abeyVitePlugin and compiled templates",
      lead:
        "Vite plugin with enforce `\"pre\"` that transforms `*.view.html` and `*.abey` into TS modules with typed mount/template helpers where applicable. Works with `abey.json` to inject a global tokens sheet via virtual `/abey-styles.js` that main imports.",
      bullets: [
        "Install: npm install --save-dev @abeyjs/compiler and register `abeyVitePlugin()` in vite.config ts/js.",
        "Template control flows: `@if`, `@for`, `{{ }}` interpolation, `[prop]` bindings, `(click)` handlers; optional `@Component` frontmatter.",
        "`abey.json` at Vite root: global CSS paths; compiler batches imports into the initial bundle.",
        "Without this package .view.html views do not compile—typical Vite startup errors if the plugin or enforce order is wrong.",
        "Syntax reference and escapes: README + packages/compiler tests; avoid pasting code into attributes without escaping.",
        "`@abeyjs/view/bindAbeyTemplate` consumes what this layer emits; same DOM contract AbeyCompiler assumes in templates.",
      ],
      footnote:
        "Web guide: OM templates (/guides/abey-templates). When migrating an existing non-Abey project, sanity-check first build—the pre-phase/virtual import can surprise until you’re used to it.",
    },
  },
  {
    slug: "cli",
    npm: "@abeyjs/cli",
    iconFa: "fa-solid fa-terminal",
    title: "@abeyjs/cli",
    spec: {
      heading: "@abeyjs/cli",
      cardTitle: "abeyjs init, connect, and generate",
      lead:
        "The `abeyjs` executable is reproducible scaffolding: spin up OM projects with different shells, point at Swagger OpenAPI to generate agents + client views or full vertical slices (`ecosystem`). Best aligns package semver with what your npm workspace has installed.",
      bullets: [
        "Global: npm install -g @abeyjs/cli or npx abeyjs <cmd> inside the workspace.",
        "`abeyjs init`: admin|abeyjs|minimal templates; flags like --shell pick chrome variants wired in main.om.",
        "`abeyjs connect` (+ generate views/codegen where applicable): pulls swagger, registers intents, CRUD-ish view scaffolding close to spec.",
        "`abeyjs generate ecosystem VerticalName`: omega/+ ui skeleton when you previously copied examples/mi-admin by hand.",
        "Keeps vite.config sane when you forgot abey-plugin or local openapi paths—still audit CORS proxies; CLI does not fix the server.",
        "After scaffold, from the new folder run npm install, npm run dev, open the template’s first route for a smoke test.",
      ],
      footnote:
        "Guides: CLI (/guides/cli), Quick start (/guides/quick-start). If codegen failed, attach swagger URL and exact command before a bug report—without that we barely reproduce.",
    },
  },
  {
    slug: "http",
    npm: "@abeyjs/http",
    iconFa: "fa-solid fa-globe",
    title: "@abeyjs/http",
    spec: {
      heading: "@abeyjs/http",
      cardTitle: "createOmegaHttp on fetch",
      lead:
        "JSON-focused client around `fetch`: emit `CH_HTTP_REQUEST`, `CH_HTTP_RESPONSE`, `CH_HTTP_ERROR` on the Omega channel to trace traffic before handlers. Supports interceptors, optional GET cache options, mutation-driven invalidation when live table views chain on the same client. Primary API story is in the package README.",
      bullets: [
        "Install: npm install @abeyjs/http. Core API: createOmegaHttp, OmegaHttp type.",
        "get/post JSON and PATCH/DELETE variants aligned with what agents call after openapi registration.",
        "Does not change server policy or CORS—you still use Vite `server.proxy` or a gateway like any modern SPA.",
        "Good for mocking: intercept requests or use MSW; the channel exposes payloads without scattered console.log.",
        "Typical integration: runtime + openapi agent share optional OmegaHttp configured once from omegaSetup.",
        "Caches and invalidation: read README—defaults affect staleness when listing large collections.",
      ],
      footnote:
        "Guides: Automatic CRUD (/guides/crud-auto), product vision (/guides/vision). Live channel traces: combine with flows + inspector where enabled.",
    },
  },
  {
    slug: "openapi",
    npm: "@abeyjs/openapi",
    iconFa: "fa-solid fa-file-code",
    title: "@abeyjs/openapi",
    spec: {
      heading: "@abeyjs/openapi",
      cardTitle: "CRUD discovery + DynamicCrudAgent",
      lead:
        "Reads an OpenAPI document to infer collection/item pairs, register dynamic List/Show/Create/Update/Delete intents, and reusable CRUD agents (`DynamicCrudAgent`). Provides `mountOpenApiCrudView` when you want a bundled list+form/trace view without rewriting everything in OM from scratch.",
      bullets: [
        "Install: npm install @abeyjs/openapi + transitive peers (@abeyjs/http, runtime).",
        "Common APIs: discoverFirstCrud, discoverAllCrud, registerOpenApiCrud, registerOpenApiAllCrud, registerWithDiscovered.",
        "`jsonObjectSchemaToZod` / `guessRowKeyFromSchema`: align server contracts with `@abeyjs/validation` and tables when schemas are sane.",
        "HTTP stays in @abeyjs/http; openapi only registers intents and agent behavior in runtime.",
        "If paths don’t match discover-crud heuristics, you can register intents manually and reuse data-driven views from @abeyjs/view alone.",
        "CLI codegen often emits stubs calling these registrars with baseUrl and Bearer pulled from bootstrapOmegaApp.",
      ],
      footnote:
        "Guides: CRUD (/guides/crud-auto), product vision (/guides/vision). Read README before pasting generated views—field overrides are subtle but powerful.",
    },
  },
  {
    slug: "validation",
    npm: "@abeyjs/validation",
    iconFa: "fa-solid fa-check-double",
    title: "@abeyjs/validation",
    spec: {
      heading: "@abeyjs/validation",
      cardTitle: "Zod, safeParseWithErrors, and field maps",
      lead:
        "Thin layer on **zod**: re-exports `z` to avoid version drift across openapi, uikit, and your app; `safeParseWithErrors` returns flattened `fields[]` with path + message for `abey-form` bindings without hand parsing. Mandatory zod peer.",
      bullets: [
        "Install: npm install @abeyjs/validation zod@^3.24 (peer ranges in package.json).",
        "`safeParseWithErrors`: `{ success:true,data } | { success:false, error, fields }` shaped for field-level error renders.",
        "Pairs well with uikit `classToSchema` when you decorate entity classes but want one schema on submit + preview.",
        "OpenAPI `jsonObjectSchemaToZod` is often an intermediate step before manual refinements.",
        "Strong server rules still win on uniqueness/RBAC—this speeds client feedback before roundtrip.",
        "Package README covers segmented vs dotted paths when backends return nested JSON issues.",
      ],
      footnote:
        "Guides: CRUD (/guides/crud-auto), Entities / forms (/guides/entities-forms). Zod type conflicts often mean two versions in node_modules after a merge—clean lockfile before burning time.",
    },
  },
  {
    slug: "uikit",
    npm: "@abeyjs/uikit",
    iconFa: "fa-solid fa-table-cells",
    title: "@abeyjs/uikit",
    spec: {
      heading: "@abeyjs/uikit",
      cardTitle: "abey-form, abey-table, and registerAbeyJsUi",
      lead:
        "`abey-*` custom elements from helpers (`mountFormView`, table columns, status badges) plus model decorators `@FormModel` / `@Label` / API selects for `classToAbeyFormConfig`. Per-control docs in README; flow details in docs/abey-table.md.",
      bullets: [
        "Install: npm install @abeyjs/uikit (+ zod—forms and validation are tightly coupled).",
        "`registerAbeyJsUi()` must run before mounting views with abey-* tags or browsers leave them undefined and fail quietly.",
        "`AbeyTableElement`, `createAbeyTable`: large lists with configurable columns + intent hooks in flow-aware mode.",
        "`AbeyFormElement` + `mount*Field`: text inputs, selects, radios, checklists, repeatable lines (e.g. invoices).",
        "`classToAbeyFormConfig` + decorators keep one TS model as the source for labels/placeholders/required across CRUD.",
        "Table/flow integration also in Tables (/guides/tables), table flows (/guides/table-flows)—intent names must match what flows register.",
      ],
      footnote:
        "Guides: Tables (/guides/tables), Tables / flows (/guides/table-flows), Entities / forms (/guides/entities-forms). Base styles usually load @abeyjs/view/theme/omega-default.css before brand overrides.",
    },
  },
  {
    slug: "agents",
    npm: "@abeyjs/agents",
    iconFa: "fa-solid fa-robot",
    title: "@abeyjs/agents",
    spec: {
      heading: "@abeyjs/agents",
      cardTitle: "OmegaAgent stack and rule-driven behavior",
      lead:
        "`OmegaAgent`, `OmegaStatefulAgent`, optional inbox (`OmegaAgentInbox`), protocol helpers, and behavior engine (`OmegaAgentBehaviorEngine` + rules/reactions). For cases where stray intents aren’t enough: encapsulate local transitions and reproducible side effects while isolating OM templates.",
      bullets: [
        "Install: npm install @abeyjs/agents. Consumes `@abeyjs/core` channels/events without DOM coupling.",
        "`OmegaStatefulAgent`: bundles StateCell-like internals plus its own intents from ecosystem scaffolding.",
        "`OmegaAgentBehaviorRule` / Reaction: declarative “when this message/event arrives, run handler” without god classes per slice.",
        "Protocol/message types steer async collaboration between agents inside the browser process.",
        "Not microservices—only models front/backend cooperation via intents + HTTP where you define it.",
        "Coming from DynamicCrudAgent? Compare—the openapi agent already covers a lot of CRUD; generic agents are custom workflows sharing intents.",
      ],
      footnote:
        "Main guide: Omega runtime (/guides/omega). `abeyjs generate ecosystem` gives skeletons you import and adapt without rewriting the vertical.",
    },
  },
  {
    slug: "flows",
    npm: "@abeyjs/flows",
    iconFa: "fa-solid fa-diagram-project",
    title: "@abeyjs/flows",
    spec: {
      heading: "@abeyjs/flows",
      cardTitle: "OmegaFlowManager, pipelines, and snapshots",
      lead:
        "Flow engine: `createOmegaFlowManager`, intent pipelines (`OmegaIntentHandlerPipeline*`), reducer facades (`Omega`, `OmegaIntentReducer`), navigational state (`OmegaFlowState`), workflow steps (`OmegaWorkflowFlow`), and snapshot helpers (`omegaAppSnapshot*`) for tooling and recovery. Binds runtime to repeatable rules on CH_INTENT_RECEIVED/etc. without sprawling view hardcoding.",
      bullets: [
        "Install: `@abeyjs/flows` is pulled by `@abeyjs/runtime`; few apps import it unless extending pipelines.",
        "`OmegaFlow`: declarative slice of an in-browser state machine with known steps/handlers before the server.",
        "`navigationIntentEvent` and channel hooks tie URL history to flows without duplicated branches.",
        "`OmegaIntentHandlerContext`: same shape handlers see after dispatch—handy when “handler doesn’t match type”.",
        "Snapshots (`omegaFlowSnapshot*`): checkpoints in localStorage/session or exported diagnostics.",
        "Flow-reactive tables (abey-table docs) expect intent names aligned with registrations or events look “lost”.",
      ],
      footnote:
        "Guides: Omega (/guides/omega), Tables / flows (/guides/table-flows). Dense package—start with omega-flow-manager + README before refactoring large view handlers.",
    },
  },
  {
    slug: "inspector",
    npm: "@abeyjs/inspector",
    iconFa: "fa-solid fa-magnifying-glass-chart",
    title: "@abeyjs/inspector",
    spec: {
      heading: "@abeyjs/inspector",
      cardTitle: "Dev bridge and hub",
      lead:
        "Debugging kit: `connectOmegaInspectorAppBridge` in the app plus external relays/hub (`startOmegaInspectorHub`, `@abeyjs/inspector/hub`). Typed wire messages (`OmegaInspectorWireMsg`) push runtime snapshots for internal tooling. Not required for prod—conditionally import via import.meta.env in dev.",
      bullets: [
        "Install: npm install --save-dev @abeyjs/inspector only where overhead is justified and prod bundles omit it.",
        "Full protocol in packages/inspector/src/index.ts exports—read before improvising payloads.",
        "README also covers inspector/app layering when extending inspector UI.",
        "“Hub port busy”? check for zombie hub processes like other websocket devtools.",
        "Doesn’t replace the browser profiler or Network tab—adds Omega intent/channel/stack visibility.",
        "Typical setup: env flag in omegaSetup loads conditional bridge after runtime boots.",
      ],
      footnote:
        "Guide: Monorepo / build (/guides/monorepo). Lighter traces without inspector: manual runtime logs and CH_HTTP_* in development.",
    },
  },
];

/**
 * `/omega` index and `/omega/:slug` — one declarative page per `@abeyjs/*` package.
 */
export function getOmegaPkgRoutes(): AppRoute[] {
  const navChildren = PKGS.map((p) => ({
    path: `/omega/${p.slug}`,
    label: p.npm,
    navIconFa: p.iconFa,
  }));

  const indexNav: PageRouteNav = {
    label: "Tools",
    title: "Tools · @abeyjs packages · AbeyJs Docs",
    navIconFa: "fa-solid fa-toolbox",
    navChildren,
  };

  const indexSpec: PageViewSpec = {
    heading: "Tools · @abeyjs packages",
    cardTitle: "How to use this section",
    lead:
      "In the sidebar, each row under Tools opens a card for an npm package published as @abeyjs/*: what problem it solves, which export to touch first, how to install, and which long guides to read next. It does not replace each packages/* README or dist/index.d.ts, but orients you without opening the whole monorepo.",
    bullets: [
      "Suggested mental order: core → runtime → view | compiler | cli; then http + openapi + validation + uikit when building CRUD; flows + agents as the slice grows; optional inspector in dev.",
      "Thematic guides (/guides/...) stay the main thread (intro → quick-start → bootstrap); Tools are reference by published npm name.",
      "Typical install: npm install <package> in the SPA; monorepo workspaces use links but exports are the same.",
      "Source and tests live here: packages/<name> for each @abeyjs/* npm name.",
      "Versioning: these cards describe the stack aligned with this docs site’s major line; mixing old versions—resolve peer/npm/tsc errors before “phantom bug” reports.",
      "In-body links on these declarative pages are intentionally not clickable: copy the /guides/… path from each card’s footer into the address bar on this docs site.",
    ],
    footnote:
      "Start with Introduction (/guides/intro) and open Tools once you know whether you need view, openapi, or core primitives—avoid name overload.",
  };

  const index = pageRoute("/omega", indexNav, indexSpec);

  const children = PKGS.map((p) =>
    pageRoute(
      `/omega/${p.slug}`,
      {
        label: "",
        title: `${p.title} · AbeyJs Docs`,
        showInNav: false,
      },
      p.spec,
    ),
  );

  return [index, ...children];
}
