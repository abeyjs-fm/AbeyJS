/**
 * Publica los workspaces `@abeyjs/*` en orden de dependencias (npm no garantiza
 * un orden estable entre workspaces).
 *
 * Requisitos: `npm login` con permiso en el scope `@abeyjs`, y versiones en cada
 * `package.json` que coincidan con las dependencias internas (`"0.1.0"`, etc.).
 *
 *   npm run publish:packages
 *   npm run publish:packages -- --dry-run
 *   npm run publish:packages -- --otp=123456
 */
const { execSync } = require("node:child_process");
const { resolve } = require("node:path");
const { WORKSPACE_ORDER } = require("./abeyjs-workspace-order.cjs");

const root = resolve(__dirname, "..");
const extraArgs = process.argv.slice(2).join(" ").trim();

for (const w of WORKSPACE_ORDER) {
  // eslint-disable-next-line no-console
  console.error(`\n>>> npm publish -w ${w}${extraArgs ? ` ${extraArgs}` : ""}\n`);
  const cmd = extraArgs ? `npm publish -w ${w} ${extraArgs}` : `npm publish -w ${w}`;
  execSync(cmd, { cwd: root, stdio: "inherit" });
}
