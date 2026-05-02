/**
 * **`@abeyjs/inspector`** — dev bridge + wire types. Same surface as **`@abeyjs/inspector/app`**.
 *
 * Hub / CLI documented in **`README.md`**; programmatic relay: **`@abeyjs/inspector/hub`** (`startOmegaInspectorHub`).
 */
export { connectOmegaInspectorAppBridge } from "./app-bridge.js";
export type {
  OmegaInspectorRole,
  OmegaInspectorWireMsg,
  OmegaInspectorHello,
  OmegaInspectorHubHelloAck,
  OmegaInspectorHubError,
  OmegaInspectorTracePush,
  OmegaInspectorTraceSnapshotReq,
  OmegaInspectorTraceSnapshotRes,
} from "./protocol.js";
