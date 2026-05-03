/**
 * Runs `bin/abey-sync-spa-paths.js` from the installed `@abeyjs/view` (works with npm `exports`; no hard-coded hoisting paths).
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const require = createRequire(path.join(WEB_ROOT, "package.json"));
const pkgRoot = path.dirname(require.resolve("@abeyjs/view/package.json"));
const cli = path.join(pkgRoot, "bin", "abey-sync-spa-paths.js");

const extra = process.argv.slice(2);
const r = spawnSync(process.execPath, [cli, "--cwd", WEB_ROOT, ...extra], {
  cwd: WEB_ROOT,
  stdio: "inherit",
});
process.exit(typeof r.status === "number" ? r.status : 1);
