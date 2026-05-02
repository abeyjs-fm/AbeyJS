/**
 * Explicit **`@abeyjs/inspector/app`** entry (preferred in dynamic **`import(...)`** from app shells — smaller mental map than root).
 *
 * Mirrors package root **`index.ts`** exports.
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
