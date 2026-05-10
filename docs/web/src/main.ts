import "/abey-styles.js";
import { bootstrapOmegaApp, registerAbeyJsUi } from "@abeyjs/view";
import "@abeyjs/view/theme/omega-default.css";

/** Needed for `abey-table` / `abey-*` under lazy OM routes (`OmegaRuntime` path + DOM-DI factory). */
registerAbeyJsUi();
/** Layout tokens (prose + outlet sizing); branding and `pageRoute` chrome: doc-site-appearance. */
import "./shared/styles/doc-shell.css";
import "./shared/styles/doc-site-appearance.css";
import "./shared/styles/doc-find.css";
import { attachDocSiteSearch } from "./doc-search-attach.js";
import { installDocsSiteRootAnchorGuard } from "./docs-site-url.js";
import { createOmega } from "./omegaSetup.js";
import { getRoutes } from "./routes.generated.js";

const app = document.getElementById("app");
if (!app) {
  throw new Error("Missing #app in index.html.");
}

function mountDocsWelcomePublic(root: HTMLElement): () => void {
  let cancelled = false;
  root.replaceChildren();
  root.className = "abey abey-app doc-site docs-welcome-entry abey--dark";
  document.title = "AbeyJs";

  void import("./views/welcome/app.docs.welcome.view.js").then(() => {
    if (cancelled) return;
    root.appendChild(document.createElement("app-docs-welcome"));
  });

  return (): void => {
    cancelled = true;
    root.replaceChildren();
    root.className = "";
  };
}

const docsShellSearchHost = document.createElement("div");
docsShellSearchHost.className = "doc-site-appbar-search-host";

let disposeDocsShellSearchUi: (() => void) | undefined;
let disposeDocsRootAnchorGuard: (() => void) | undefined;

const result = bootstrapOmegaApp(app, {
  createOmega,
  auth: {
    publicPaths: ["/"],
    isAuthenticated: () => false,
    mountPublic: mountDocsWelcomePublic,
  },
  shell: {
    brand: "AbeyJs",
    brandTitleSplit: { lead: "Abey", tail: "JS" },
    subBrand: "docs",
    variant: "admin",
    dashboardLayout: true,
    appearance: "dark",
    persistAppearance: true,
    appDocumentTitle: "AbeyJs Docs",
    rootClassName: "abey abey-app doc-site",
    sidebarMenuMode: "compact",
    /** Search bar shared with the landing page (`attachDocSiteSearch`). */
    pathnameBase: import.meta.env.BASE_URL,
    appBarInset: docsShellSearchHost,
    /** No demo bell/mail placeholders in the docs shell. */
    appBarActions: [],
    /**
     * Docs brand palette (dark): electric blue `#2E7DFF` → violet `#9D2CFF` (JS mark gradient), near-black surfaces.
     * `--doc-brand-purple`: violet end for glows / mixed accents.
     */
    themeVarsDark: {
      "abey-accent": "#2E7DFF",
      "--doc-brand-hue-2": "#6848FC",
      "--doc-brand-purple": "#9D2CFF",
      "--abey-brand-mark-lead": "#ffffff",
      "--abey-brand-tail-a": "#2E7DFF",
      "--abey-brand-tail-b": "#6848FC",
      "--abey-brand-tail-c": "#9D2CFF",
    },
    /** Light “lite” theme: purple `#6B46C1` → blue `#3182CE`, Chakra-like surfaces (`#F7FAFC` / white). */
    themeVarsLight: {
      "abey-accent": "#3182CE",
      "abey-accent-hover": "#2B6CB0",
      "abey-bg": "#F7FAFC",
      "abey-surface": "#FFFFFF",
      "abey-surface-elev": "#FFFFFF",
      "abey-border": "#E2E8F0",
      "abey-text": "#2D3748",
      "abey-text-muted": "#4A5568",
      "--doc-brand-hue-2": "#6B46C1",
      "--doc-brand-purple": "#805AD5",
      /** On purple bar: light lead; „JS“ goes light→blue (not dark purple on purple). */
      "--abey-brand-mark-lead": "#ffffff",
      "--abey-brand-tail-a": "#f0f9ff",
      "--abey-brand-tail-b": "#93c5fd",
      "--abey-brand-tail-c": "#2563eb",
    },
    /** Optional logo (**`vite`**: **`new URL('./assets/logo.svg', import.meta.url).href`**): */
    // brandLogoSrc: new URL("./assets/logo-abey.svg", import.meta.url).href,
    // brandLogoAlt: "AbeyJs",
    routes: getRoutes(),
  },
});

const { router, dispose, runtime } = result;
void runtime;

disposeDocsRootAnchorGuard = installDocsSiteRootAnchorGuard(
  router ? (path) => router.navigate(path) : undefined,
);

if (router) {
  disposeDocsShellSearchUi = attachDocSiteSearch(
    docsShellSearchHost,
    (path) => {
      router.navigate(path);
    },
  );
}

if (import.meta.env.DEV && router) {
  (globalThis as Record<string, unknown>).__abeyRouter = router;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeDocsShellSearchUi?.();
    disposeDocsShellSearchUi = undefined;
    disposeDocsRootAnchorGuard?.();
    disposeDocsRootAnchorGuard = undefined;
    dispose();
  });
}
