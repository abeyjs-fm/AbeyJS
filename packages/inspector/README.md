# `@abeyjs/inspector`

Dev-time **AbeyJs Inspector**: a tiny **WebSocket hub** plus a **browser bridge** that streams **`OmegaRuntime`** trace events (`RuntimeTraceEvent` from `@abeyjs/runtime`) to any client that speaks the inspector wire protocol. Use it to watch channel traffic (`omega/http:*`, nav, flows, etc.) in near real time alongside the **`correlationId`** that ties requests to downstream events.

Ships three surfaces (see **`package.json` `exports`**):

| Subpath | Role |
|---------|------|
| **`@abeyjs/inspector`** | Same as `./app`: **`connectOmegaInspectorAppBridge`** + wire types. |
| **`@abeyjs/inspector/app`** | Explicit import path used in templates (**`omegaSetup`** dynamic import). |
| **`@abeyjs/inspector/hub`** | **`startOmegaInspectorHub`** for embedding or tests. |

**CLI / binary:** `abeyjs-inspector-hub` (runs **`dist/cli.js`** after build).

---

## Architecture

```
  OmegaRuntime.channel  ──onAll──▶  app bridge  ──WebSocket──▶  Inspector Hub  ──fan-out──▶  inspector UI(s)
        │                                                                  │
        └────────── trace ring buffer (≤2000) ◀──────────────── snapshot ────┘
```

1. **`OmegaRuntime`** mirrors every bus event into an internal **`_trace`** ring (when tracing is enabled), and exposes **`getTraceSnapshot()`**.
2. **`connectOmegaInspectorAppBridge`** attaches **`runtime.channel.onAll`**, reshapes payloads into **`RuntimeTraceEvent`**, and sends **`{ type:"trace", ev }`** frames to the hub.
3. The **hub** (**`startOmegaInspectorHub`**) multiplexes peers by **`appId`**. **Apps** push traces; **inspectors** receive live **`trace`** messages and may request **`trace/snapshot`**.
4. A reference UI lives in **`examples/abeyjs-inspector`** (standalone page that connects with **`role: "inspector"`**).

---

## Run the hub (CLI)

After building this package:

```bash
npm run build -w @abeyjs/inspector
npm -w @abeyjs/inspector run hub
# or globally / from PATH once linked:
abeyjs-inspector-hub --host 127.0.0.1 --port 7071
```

**Environment variables** (defaults shown):

| Variable | Default |
|----------|---------|
| `OMEGA_INSPECTOR_HOST` | `127.0.0.1` |
| `OMEGA_INSPECTOR_PORT` | `7071` |

CLI flags **`--host`** and **`--port`** override env when supplied.

HTTP **`GET /**` responds with plain text **`AbeyJs Inspector Hub`** — the WebSocket attaches on the **HTTP upgrade** to the same server (path-agnostic **`ws://host:port/`** endpoint).

---

## Wire protocol (`protocol.ts`)

Messages are UTF-8 **JSON**. The **first** message every socket sends must be **`hello`**.

### Handshake

**App or inspector → hub**

```json
{ "type": "hello", "role": "app" | "inspector", "appId": "<string>", "token": "<optional>" }
```

**Hub → peer**

```json
{ "type": "hello/ack", "ok": true, "appId": "...", "role": "...", "hubTime": 1735689600123 }
```

Or on bad first frame:

```json
{ "type": "error", "message": "Expected hello" }
```

(`token` is reserved; the hub **does not** validate secrets yet.)

### Traces

**App → hub** (after hello):

```json
{ "type": "trace", "ev": { "name": "omega/http:request", "data": { }, "correlationId": "…", "timestamp": 1735689600123, "source": "omega-http" } }
```

Hub **drops** malformed trace frames (missing **`ev.name`**). It **buffers** traces per **`appId`** (**`maxTrace`**, clamped **`50 … 20000`**, default **2000**) and **fans out** to every connected **`inspector`** for that **`appId`**.

When an inspector finishes hello and the hub already has buffered traces, it immediately sends **`trace/snapshot`** with up to **200** recent items.

### Snapshots

**Inspector → hub**

```json
{ "type": "trace/snapshot", "limit": 600 }
```

**Hub → inspector**

```json
{ "type": "trace/snapshot", "items": [ /* RuntimeTraceEvent */ ] }
```

**`limit`** is clamped to **`10 … 2000`** (defaults to **200** if missing/invalid).

---

## Browser bridge (`connectOmegaInspectorAppBridge`)

**Imports:** `@abeyjs/inspector` **or** `@abeyjs/inspector/app`.

```ts
import { createOmegaRuntime } from "@abeyjs/runtime";
import { connectOmegaInspectorAppBridge } from "@abeyjs/inspector";

const runtime = createOmegaRuntime();

const bridge = connectOmegaInspectorAppBridge(runtime, {
  url: "ws://127.0.0.1:7071",
  appId: "my-app-dev",
});

// teardown
bridge.close();
```

**Behaviour:**

- Subscribes with **`runtime.channel.onAll`** and forwards each **`OmegaEvent`** as **`RuntimeTraceEvent`** (`name`, `data`/`payload`, `correlationId`, `timestamp`, `source`).
- Buffers up to **500** events **before** **`hello/ack`** (when the socket is not ready yet); trims oldest.
- Optional **`sendSnapshotOnConnect`** (default **`true`**): pushes **`runtime.getTraceSnapshot().slice(-200)`** after open so the hub receives recent history.
- **Reconnect** (default **`true`**) uses exponential backoff (**`reconnectBaseDelayMs`** × **1.6^attempt**, capped **`reconnectMaxDelayMs`**).
- **`close()`** unsubscribes and closes the **`WebSocket`**.

**Runtime note:** reconnect scheduling uses **`window.setTimeout`** — load this path only in a **browser** (or stub **`window`**).

**Returned `ws`:** the initial handle may **`undefined`** until the async connection opens; **`close()`** remains the stable teardown API.

Templates wire this in **`omegaSetup`** only on **localhost**, **dev build**, unless **`?omegaInspector=off`** (see generated **`packages/cli/templates/**/omegaSetup.ts`**).

---

## Programmatic hub (`startOmegaInspectorHub`)

For tests or composing your own tooling:

```ts
import { startOmegaInspectorHub } from "@abeyjs/inspector/hub";

const hub = await startOmegaInspectorHub({ host: "127.0.0.1", port: 7071, maxTrace: 2000 });
console.log(hub.url); // ws://127.0.0.1:7071

await hub.close();
```

Same WebSocket semantics as the CLI binary.

---

## Dependencies

| Package | Use |
|---------|-----|
| `@abeyjs/runtime` | **`OmegaRuntime`**, **`RuntimeTraceEvent`** shape consumed by hubs/UI. |
| `@abeyjs/core` | **`Unsubscribe`** / channel listener typing in the bridge. |
| `ws` | WebSocket server on Node (hub). |

---

## Build

```bash
npm run build -w @abeyjs/inspector
```

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Hub rejects connection immediately | First frame must be valid **`hello`** JSON with **`type`**, **`role`**, **`appId`**. |
| Inspector shows no traffic | Matching **`appId`** on bridge **and** inspector; confirm an **app** socket is connected, not inspector-only. |
| Floods disconnect | Inspect **`maxTrace`** / inspector UI retention; hub logs first few events plus every 50th. |
| Bridge never attaches | SSR / non-browser: **`window`** missing; **`import("@abeyjs/inspector/app")` only in guarded client branch** (`typeof window`). |
