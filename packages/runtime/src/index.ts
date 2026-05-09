/**
 * **`@abeyjs/runtime`** — **`OmegaRuntime`**: channel + flow manager + DI + agents + trace ring; URL helpers in **`url-bridge`**.
 * Entry: **`createOmegaRuntime`**. Overview: **`README.md`** in this package.
 */
export {
  createOmegaRuntime,
  OmegaRuntime,
  type OmegaModule,
  type OmegaPlugin,
  type RuntimeTraceEvent,
} from "./runtime.js";
export { OmegaContainer, omegaToken, type OmegaToken } from "./omega-container.js";
export type { OmegaRegisteredAgent } from "./omega-registered-agent.js";
export { intentFromQuery, setPath, startUrlIntentSync, type PathIntentMap } from "./url-bridge.js";

// DOM & Component Base (Moved from @abeyjs/view to break circular dependencies)
export {
  defineAbeyComponent,
  AbeyComponent,
  AbeyComponentElement,
  type AbeyComponentMeta,
} from "./dom/define-abey-component.js";
export { bindAbeyTemplate, type BoundTemplate, type AbeyTemplateContext } from "./dom/bind-abey-template.js";
export { mountModuleStyles, type ModuleStylesHandle } from "./dom/mount-module-styles.js";
export { injectFromDom, tryInjectFromDom, AbeyProvideElement, type DomDiToken, type DomDiFactory } from "./di/dom-di.js";

