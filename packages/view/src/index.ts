/**
 * **`@abeyjs/view`** — AbeyJs DOM view layer: routed shell (**`bootstrapOmegaApp`**), **`PathRouter`**,
 * **`mountList*` / `mountForm*`** (data-driven defs), **`AbeyComponent`**, templates, DOM DI, **signals**, safe HTML.
 *
 * Register UI tags once: **`registerAbeyJsUi()`**. Theme: **`@abeyjs/view/theme/omega-default.css`**.
 * Dev-only: **`@abeyjs/view/dev/vite-logger`**, **`@abeyjs/view/dev/vite-malformed-uri-guard`**, **`@abeyjs/view/dev/vite-docs-static-site`**. Full tour: **`README.md`**.
 */
export type {
  DataViewDef,
  FieldKind,
  FieldSelectOptions,
  FormSlice,
  FormViewDef,
  ListSlice,
  ListViewDef,
  OpenApiCrudFieldUiOverride,
  OpenApiCrudFieldUiOverrides,
  ViewField,
} from "./view-types.js";
export { applyViewTheme, ABEYJS_VIEW_BASE_CLASS, type ViewTheme } from "./view-theme.js";
export {
  createPathRouter,
  normalizeBasename,
  normalizePathname,
  stripBasenameFromPathname,
  withBasename,
  type CreatePathRouterOptions,
  type PathRouter,
} from "./router/path-router.js";
export {
  hrefUnderPathnameBase,
  pathIsUnderPathnameBase,
  rewriteRootAbsoluteAnchorsForPathnameBase,
  installPathnameBaseAnchorClickGuard,
} from "./router/pathname-base-nav.js";
export { firstNavPath, matchAppRoute, type AppRoute, type AppRouteNavChild } from "./shell/app-routes.js";
export {
  fetchSidebarNav,
  buildRoutesFromApi,
  type ApiNavItem,
  type FetchSidebarNavOptions,
} from "./shell/nav-from-api.js";
export {
  mountAppShell,
  mountRoutedApp,
  defaultShellAppBarActions,
  ABEY_SHELL_APPEARANCE_STORAGE_KEY,
  getResolvedAdminAppearance,
  type MountAppShellAppearanceToggle,
  type MountRoutedAppConfig,
  type NavItem,
  type ShellAppBarAction,
  type ShellAppBarDropdownItem,
  type ShellAppearanceMode,
  type ShellThemeVars,
  type ShellSidebarMenuMode,
  type ShellVariant,
} from "./shell/mount-routed-app.js";
export {
  bootstrapOmegaApp,
  type BootstrapOmegaAppConfig,
  type BootstrapOmegaAppResult,
  type BootstrapOmegaAuthConfig,
  type BootstrapOmegaRouter,
} from "./bootstrap/omega-bootstrap.js";
export { getBootstrapRuntime } from "./bootstrap/omega-runtime.js";
export { inject, tryInject } from "./di/inject.js";
export { injectFromDom, tryInjectFromDom, AbeyProvideElement, type DomDiToken, type DomDiFactory } from "./di/dom-di.js";
export {
  DOM_CHANNEL_TOKEN,
  DOM_CHANNEL_FACTORY,
  ABEY_DOM_TOKEN_CHANNEL,
  ABEY_DOM_FACTORYPATH_CHANNEL,
} from "./di/dom-di-tokens.js";
export { mountFormView, mountIntentButton, createOmegaFormSurface } from "./dom/mount-form.js";
export { entityToFormValues } from "./form/entity-form-values.js";
export { mountListView } from "./dom/mount-list.js";
export { mountListViewSync } from "./dom/mount-list-sync.js";
export { mountBoundText } from "./dom/mount-text.js";
export { bindActions, type ActionMap, type ActionHandler } from "./dom/bind-actions.js";
export { bindAbeyTemplate, type BoundTemplate, type AbeyTemplateContext } from "./dom/bind-abey-template.js";
export { AbeyWidgetElement, type AbeyWidgetState } from "./dom/abey-widget.js";
export {
  defineAbeyComponent,
  AbeyComponent,
  AbeyComponentElement,
  type AbeyComponentMeta,
} from "./dom/define-abey-component.js";
export { componentRoute, type ComponentRouteNav, type ComponentRouteSpec } from "./dom/component-route.js";
export { getRole, tryGetRole } from "./dom/roles.js";
export { mountSignalList, type MountedSignalList, type SignalListOptions } from "./dom/mount-signal-list.js";
export { mountLifecycle, type MountLifecycle, type OnDestroy } from "./dom/mount-lifecycle.js";
export {
  mountInterpolatedTemplate,
  type InterpolationBindings,
  type InterpolationBinding,
  type MountedInterpolatedTemplate,
} from "./dom/mount-interpolated-template.js";
export { createTemplateView, type TemplateView } from "./dom/template-view.js";
export {
  mountReactiveTemplate,
  type MountedReactiveTemplate,
  type ReactiveInterpolationBinding,
  type ReactiveInterpolationBindings,
} from "./dom/mount-reactive-template.js";
export { mountTracePanel, type TracePanelOptions } from "./dom/trace-panel.js";
export { mountModuleStyles, type ModuleStylesHandle } from "./dom/mount-module-styles.js";
export { defineAbeyUxView, type AbeyUxViewInitCtx, type AbeyUxViewMeta } from "./dom/define-abey-ux-view.js";
export { withModuleStyles } from "./dom/with-module-styles.js";
export {
  buildPageView,
  createPageViewElement,
  pageRoute,
  type PageRouteNav,
  type PageViewSpec,
} from "./declarative-page.js";
export {
  signal,
  readonlySignal,
  computed,
  isSignal,
  type SignalOptions,
  type OmegaReadableSignal,
  type OmegaSignal,
  type Unsubscribe,
} from "./state/signal.js";
export {
  dataTable,
  mountScreenView,
  registerScreenSource,
  screen,
  search,
  select,
  type DataTableBlock,
  type DataTableColumn,
  type ScreenSpec,
  type ToolbarItem,
  type ToolbarSearch,
  type ToolbarSelect,
} from "./blocks-screen.js";
export { lazyViewMount } from "./lazy-view.js";
export {
  bindText,
  clearSanitizedHtmlHost,
  configureSanitize,
  escapeHtml,
  getByPath,
  AbeyJs,
  sanitize,
  setSanitizedHtml,
} from "./safe-html.js";
export { registerAbeyJsView, AbeyJsViewElement } from "./abeyjs-view-element.js";
export { mountAbeyJsViewTemplate, type AbeyJsViewTemplateOptions } from "./abeyjs-view-template.js";
export { registerAbeyJsUi } from "./register-abey-ui.js";
// Dev-only helpers (Node-side) are exported via subpath: `@abeyjs/view/dev/vite-logger`.
