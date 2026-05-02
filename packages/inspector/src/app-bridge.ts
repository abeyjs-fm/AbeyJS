/**
 * Bridges **`OmegaRuntime.channel`** to the inspector hub: mirrors **`onAll`** traffic as **`RuntimeTraceEvent`** frames and
 * optionally seeds the session with **`runtime.getTraceSnapshot()`** right after the WebSocket opens.
 *
 * **Browser-oriented** (uses **`window.setTimeout`** for reconnect). See **`README.md`** for protocol + env expectations.
 */

import type { OmegaRuntime, RuntimeTraceEvent } from "@abeyjs/runtime";
import type { Unsubscribe } from "@abeyjs/core";
import type { OmegaInspectorWireMsg } from "./protocol.js";

export type OmegaInspectorAppBridgeOptions = {
  /** Hub WS url, e.g. `ws://127.0.0.1:7071` */
  url: string;
  /** Logical app id (lets you connect multiple apps to same hub). */
  appId: string;
  /** Optional shared secret; not enforced yet by hub. */
  token?: string;
  /** Default: true */
  sendSnapshotOnConnect?: boolean;
  /** Default: true (auto reconnect if hub restarts). */
  reconnect?: boolean;
  /** Default: 600ms */
  reconnectBaseDelayMs?: number;
  /** Default: 8000ms */
  reconnectMaxDelayMs?: number;
};

export type OmegaInspectorAppBridgeHandle = {
  /** Live socket once connected; may be stale until `open` — prefer **`close()`** for lifecycle. */
  ws?: WebSocket;
  /** Unsubscribes from runtime bus + closes WebSocket (idempotent/guarded). */
  close: () => void;
};

function wsSend(ws: WebSocket, msg: OmegaInspectorWireMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* */
  }
}

/**
 * Pipe runtime bus traffic to an inspector hub under **`opts.appId`**.
 *
 * @param runtime Source of truth for tracing (`channel.onAll` + optional snapshot seed).
 * @param opts.url Hub base (`ws://host:port`). Token not enforced server-side yet.
 */
export function connectOmegaInspectorAppBridge(runtime: OmegaRuntime, opts: OmegaInspectorAppBridgeOptions): OmegaInspectorAppBridgeHandle {
  const sendSnapshotOnConnect = opts.sendSnapshotOnConnect ?? true;
  const reconnect = opts.reconnect ?? true;
  const baseDelay = Math.max(100, Number(opts.reconnectBaseDelayMs ?? 600));
  const maxDelay = Math.max(baseDelay, Number(opts.reconnectMaxDelayMs ?? 8000));

  let off: Unsubscribe | null = null;
  let buffered: RuntimeTraceEvent[] = [];
  let ready = false;
  let disposed = false;
  let ws: WebSocket | undefined;
  let attempt = 0;

  const nextDelay = () => Math.min(maxDelay, Math.round(baseDelay * Math.pow(1.6, attempt++)));

  const flush = () => {
    if (!ready) return;
    for (const ev of buffered) {
      if (ws) wsSend(ws, { type: "trace", ev });
    }
    buffered = [];
  };

  off = runtime.channel.onAll((ev) => {
    const tr: RuntimeTraceEvent = {
      name: ev.name,
      data: ev.payload as any,
      correlationId: ev.meta.correlationId,
      timestamp: ev.meta.timestamp,
      source: ev.meta.source,
    };
    if (!ready) {
      buffered.push(tr);
      if (buffered.length > 500) buffered = buffered.slice(-500);
      return;
    }
    if (ws) wsSend(ws, { type: "trace", ev: tr });
  });

  const connect = () => {
    if (disposed) return;
    try {
      ws = new WebSocket(opts.url);
    } catch {
      ws = undefined;
    }
    if (!ws) return;

    ws.addEventListener("open", () => {
      attempt = 0;
      wsSend(ws!, { type: "hello", role: "app", appId: opts.appId, token: opts.token });
      ready = true;
      // eslint-disable-next-line no-console
      console.log(`[AbeyJs Inspector] bridge open url=${opts.url} appId=${opts.appId}`);
      if (sendSnapshotOnConnect) {
        const snap = runtime.getTraceSnapshot().slice(-200);
        for (const ev of snap) {
          wsSend(ws!, { type: "trace", ev });
        }
      }
      flush();
    });

    const scheduleReconnect = () => {
      if (disposed) return;
      if (!reconnect) return;
      const d = nextDelay();
      window.setTimeout(() => connect(), d);
    };

    ws.addEventListener("close", () => {
      ready = false;
      // eslint-disable-next-line no-console
      console.log(`[AbeyJs Inspector] bridge closed url=${opts.url} appId=${opts.appId}`);
      scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      ready = false;
      // eslint-disable-next-line no-console
      console.log(`[AbeyJs Inspector] bridge error url=${opts.url} appId=${opts.appId}`);
      scheduleReconnect();
    });
  };

  connect();

  return {
    ws,
    close: () => {
      disposed = true;
      try {
        off?.();
      } catch {
        /* */
      }
      off = null;
      try {
        ws?.close();
      } catch {
        /* */
      }
    },
  };
}

