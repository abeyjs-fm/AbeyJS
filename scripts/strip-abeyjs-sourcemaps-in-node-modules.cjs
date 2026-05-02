/**
 * Quita **`.map`** y la línea **`//# sourceMappingURL=...`** en **`node_modules/@abeyjs/*/dist`**
 * para silenciar avisos de Vite (“Sourcemap … points to missing source files”) cuando las
 * versiones instaladas de npm aún se publicaron con **`sourceMap: true`** y sin **`src/`** en el tarball.
 *
 * Uso (desde la raíz del proyecto consumidor, p. ej. `prueba`):
 *   node path/to/AbeyJs/scripts/strip-abeyjs-sourcemaps-in-node-modules.cjs
 *
 * Opcional — otra raíz donde exista **`node_modules/@abeyjs`**:
 *   node …/strip-abeyjs-sourcemaps-in-node-modules.cjs "C:/otro/proyecto"
 */
const { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const targetRoot = resolve(process.argv[2] || process.cwd());
const abeyRoot = join(targetRoot, "node_modules", "@abeyjs");

if (!existsSync(abeyRoot)) {
  // eslint-disable-next-line no-console
  console.error(`[strip-abeyjs-sourcemaps] No existe: ${abeyRoot}`);
  process.exit(1);
}

let removedMaps = 0;
let patchedJs = 0;

function walkFiles(dir, pred) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(p, pred));
    else if (pred(p, ent.name)) out.push(p);
  }
  return out;
}

for (const pkg of readdirSync(abeyRoot, { withFileTypes: true })) {
  if (!pkg.isDirectory()) continue;
  const dist = join(abeyRoot, pkg.name, "dist");
  if (!existsSync(dist)) continue;

  for (const mapPath of walkFiles(dist, (_, n) => n.endsWith(".map"))) {
    unlinkSync(mapPath);
    removedMaps += 1;
  }

  for (const jsPath of walkFiles(dist, (_, n) => n.endsWith(".js"))) {
    const src = readFileSync(jsPath, "utf8");
    const next = src.replace(/\r?\n\/\/# sourceMappingURL=.*$/m, "").replace(/\r?\n\/\/@ sourceMappingURL=.*$/m, "");
    if (next !== src) {
      writeFileSync(jsPath, next, "utf8");
      patchedJs += 1;
    }
  }
}

// eslint-disable-next-line no-console
console.log(
  `[strip-abeyjs-sourcemaps] OK — ${removedMaps} .map eliminados, ${patchedJs} .js sin sourceMappingURL (${abeyRoot})`,
);
