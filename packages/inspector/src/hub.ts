/**
 * Minimal **multi-tenant inspector relay**: upgrades HTTP → WebSocket (`ws`), shards sockets by **`appId`**, stores a rolling
 * trace buffer server-side (`maxTrace`, default mirrored to runtime caps), forwards **`trace`** from apps to inspectors, and serves
 * optional **`trace/snapshot`** histories.
 */

import http from "node:http";
import type { IncomingMessage } from "node:http";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import type { RawData } from "ws";
import type { RuntimeTraceEvent } from "@abeyjs/runtime";
import {
  safeJsonParse,
  type OmegaInspectorHello,
  type OmegaInspectorWireMsg,
} from "./protocol.js";

export type StartOmegaInspectorHubOptions = {
  host?: string;
  port?: number;
  /**
   * Optional max events kept per app for snapshot requests.
   * Default: 2000 (same as runtime trace cap).
   */
  maxTrace?: number;
};

export type OmegaInspectorHub = {
  /** WebSocket base URL produced by **`server.listen`** (scheme `ws:` + resolved port). */
  url: string;
  /** Tear down **`WebSocketServer`** then HTTP **`server`** (best-effort). */
  close: () => Promise<void>;
};

type AppBucket = {
  apps: Set<WebSocket>;
  inspectors: Set<WebSocket>;
  trace: RuntimeTraceEvent[];
};

function isHello(x: unknown): x is OmegaInspectorHello {
  return (
    !!x &&
    typeof x === "object" &&
    (x as any).type === "hello" &&
    ((x as any).role === "app" || (x as any).role === "inspector") &&
    typeof (x as any).appId === "string"
  );
}

function wsSend(ws: WebSocket, msg: OmegaInspectorWireMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* */
  }
}

/**
 * Start the inspector hub (**Node**). Inspectors/apps connect plain WS to **`url`** — no pathname routing yet.
 *
 * Routing model: **`Map<appId, { apps, inspectors, trace[] }>`** — **apps** feed traces into **`trace`**; inspectors receive live pushes plus optional snapshots after handshake.
 *
 * Quiet log policy: echoes first **`5`** inbound trace names per peer, then summaries every **`50`** events.
 */
export async function startOmegaInspectorHub(opts: StartOmegaInspectorHubOptions = {}): Promise<OmegaInspectorHub> {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 7071;
  const maxTrace = Math.max(50, Math.min(20000, opts.maxTrace ?? 2000));

  const server = http.createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("AbeyJs Inspector Hub\n");
  });

  const wss = new WebSocketServer({ noServer: true });
  const buckets = new Map<string, AppBucket>();

  const bucketFor = (appId: string): AppBucket => {
    const b = buckets.get(appId);
    if (b) return b;
    const next: AppBucket = { apps: new Set(), inspectors: new Set(), trace: [] };
    buckets.set(appId, next);
    return next;
  };

  const cleanupSocket = (ws: WebSocket, hello: OmegaInspectorHello | null) => {
    if (!hello) return;
    const b = buckets.get(hello.appId);
    if (!b) return;
    if (hello.role === "app") b.apps.delete(ws);
    if (hello.role === "inspector") b.inspectors.delete(ws);
    if (b.apps.size === 0 && b.inspectors.size === 0) {
      buckets.delete(hello.appId);
    }
  };

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    let hello: OmegaInspectorHello | null = null;
    let traceCount = 0;

    ws.on("message", (data: RawData) => {
      const raw = typeof data === "string" ? data : Buffer.from(data as any).toString("utf-8");
      const parsed = safeJsonParse(raw);

      if (!hello) {
        if (!isHello(parsed)) {
          wsSend(ws, { type: "error", message: "Expected hello" });
          try {
            ws.close();
          } catch {
            /* */
          }
          return;
        }
        hello = parsed;
        const b = bucketFor(hello.appId);
        if (hello.role === "app") b.apps.add(ws);
        if (hello.role === "inspector") b.inspectors.add(ws);
        wsSend(ws, { type: "hello/ack", ok: true, appId: hello.appId, role: hello.role, hubTime: Date.now() });
        // eslint-disable-next-line no-console
        console.log(`[AbeyJs Inspector Hub] connected role=${hello.role} appId=${hello.appId}`);
        if (hello.role === "inspector" && b.trace.length) {
          wsSend(ws, { type: "trace/snapshot", items: b.trace.slice(-200) });
        }
        return;
      }

      // After hello: accept trace pushes from app and snapshot requests from inspector.
      if (!parsed || typeof parsed !== "object") return;

      const b = bucketFor(hello.appId);
      const t = (parsed as any).type;

      if (hello.role === "app" && t === "trace") {
        const ev = (parsed as any).ev as RuntimeTraceEvent | undefined;
        if (!ev || typeof ev?.name !== "string") return;
        b.trace.push(ev);
        if (b.trace.length > maxTrace) {
          b.trace = b.trace.slice(-maxTrace);
        }
        traceCount++;
        if (traceCount <= 5) {
          // eslint-disable-next-line no-console
          console.log(`[AbeyJs Inspector Hub] appId=${hello.appId} event#${traceCount} ${ev.name}`);
        }
        if (traceCount % 50 === 0) {
          // eslint-disable-next-line no-console
          console.log(`[AbeyJs Inspector Hub] appId=${hello.appId} received ${traceCount} events (last=${ev.name})`);
        }
        for (const ins of b.inspectors) {
          wsSend(ins, { type: "trace", ev });
        }
        return;
      }

      if (hello.role === "inspector" && t === "trace/snapshot") {
        const limit = Number((parsed as any).limit ?? 200);
        const lim = Number.isFinite(limit) ? Math.max(10, Math.min(2000, limit)) : 200;
        wsSend(ws, { type: "trace/snapshot", items: b.trace.slice(-lim) });
        return;
      }
    });

    ws.on("close", () => cleanupSocket(ws, hello));
    ws.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.log(`[AbeyJs Inspector Hub] socket error appId=${hello?.appId ?? "-"} role=${hello?.role ?? "-"}: ${String((e as any)?.message ?? e)}`);
      cleanupSocket(ws, hello);
    });
  });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    // Only one WS endpoint for now.
    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wss.emit("connection", ws, req);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.on("error", reject);
  });

  const url = `ws://${host}:${(server.address() as any).port}`;

  return {
    url,
    close: async () => {
      await new Promise<void>((resolve) => {
        try {
          wss.close(() => resolve());
        } catch {
          resolve();
        }
      });
      await new Promise<void>((resolve) => {
        try {
          server.close(() => resolve());
        } catch {
          resolve();
        }
      });
    },
  };
}

