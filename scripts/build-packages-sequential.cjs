/**
 * Compila cada `@abeyjs/*` en orden, para que `dist/` de dependencias exista
 * antes del `tsc` del siguiente (el `npm run build` con varios `-w` puede
 * ejecutar builds en paralelo y fallar en algunos entornos).
 */
const { execSync } = require("node:child_process");
const { resolve } = require("node:path");
const { WORKSPACE_ORDER } = require("./abeyjs-workspace-order.cjs");

const root = resolve(__dirname, "..");

for (const w of WORKSPACE_ORDER) {
  // eslint-disable-next-line no-console
  console.error(`\n>>> npm run build -w ${w}\n`);
  execSync(`npm run build -w ${w}`, { cwd: root, stdio: "inherit" });
}
