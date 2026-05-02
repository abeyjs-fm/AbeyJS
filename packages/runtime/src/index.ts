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
