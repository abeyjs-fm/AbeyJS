import type { RuntimeTraceEvent } from "@abeyjs/runtime";

/**
 * JSON messages exchanged between **apps**, **inspector frontends**, and **`startOmegaInspectorHub`**.
 *
 * Ordering: TCP/WebSocket payloads are **`JSON.stringify` / UTF-8**; **`hello`** is mandatory as the opening frame on every new socket.
 * See **`README.md`** for defaults (snapshot tail length, **`limit`** clamp, ring buffer sizing).
 */

export type OmegaInspectorRole = "app" | "inspector";

export type OmegaInspectorHello = {
  type: "hello";
  role: OmegaInspectorRole;
  appId: string;
  /** Optional shared secret reserved for TLS/auth stories; hubs today ignore it. */
  token?: string;
};

/** Hub acknowledges registration and echoes routing keys for logging/debug UIs. */
export type OmegaInspectorHubHelloAck = {
  type: "hello/ack";
  ok: true;
  appId: string;
  role: OmegaInspectorRole;
  hubTime: number;
};

/** Protocol-level refusal (e.g. missing first-frame `hello`). */
export type OmegaInspectorHubError = {
  type: "error";
  message: string;
};

/** Canonical trace frame produced by **`connectOmegaInspectorAppBridge`** and relayed verbatim to inspectors. */
export type OmegaInspectorTracePush = {
  type: "trace";
  ev: RuntimeTraceEvent;
};

/** Inspector asks for **`items.slice(-limit)`** from the hub’s per-`appId` buffer. */
export type OmegaInspectorTraceSnapshotReq = {
  type: "trace/snapshot";
  limit?: number;
};

export type OmegaInspectorTraceSnapshotRes = {
  type: "trace/snapshot";
  items: RuntimeTraceEvent[];
};

export type OmegaInspectorWireMsg =
  | OmegaInspectorHello
  | OmegaInspectorHubHelloAck
  | OmegaInspectorHubError
  | OmegaInspectorTracePush
  | OmegaInspectorTraceSnapshotReq
  | OmegaInspectorTraceSnapshotRes;

/** Best-effort `JSON.parse` for hostile/unknown payloads (returns `null` on failure/non-string input). */
export function safeJsonParse(input: unknown): unknown {
  if (typeof input !== "string") return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

