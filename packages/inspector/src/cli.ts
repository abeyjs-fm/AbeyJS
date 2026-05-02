/**
 * Executable entry (**`npm -w @abeyjs/inspector run hub`** / **`abeyjs-inspector-hub`** after build).
 *
 * Usage: `node ./dist/cli.js [--host HOST] [--port PORT]`
 * Env: **`OMEGA_INSPECTOR_HOST`**, **`OMEGA_INSPECTOR_PORT`** fallback when CLI flags absent.
 */

import { startOmegaInspectorHub } from "./hub-entry.js";

function readArg(name: string): string | null {
  const i = process.argv.findIndex((a) => a === `--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1] ?? null;
  return null;
}

const host = readArg("host") ?? process.env.OMEGA_INSPECTOR_HOST ?? "127.0.0.1";
const portRaw = readArg("port") ?? process.env.OMEGA_INSPECTOR_PORT ?? "7071";
const port = Number(portRaw);

const hub = await startOmegaInspectorHub({ host, port: Number.isFinite(port) ? port : 7071 });
// eslint-disable-next-line no-console
console.log(`[AbeyJs Inspector Hub] listening at ${hub.url}`);

const onSig = async () => {
  try {
    await hub.close();
  } finally {
    process.exit(0);
  }
};
process.on("SIGINT", onSig);
process.on("SIGTERM", onSig);

