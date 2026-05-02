/**
 * Elimina el directorio **`dist`** de cada paquete bajo **`packages`**. **`tsc`** no borra
 * ficheros huérfanos (p. ej. **`.js.map`** si se desactivó **`sourceMap`**).
 */
const { existsSync, readdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");

/** @param {string} repoRoot Absolute path del raíz del monorepo */
function cleanPackagesDist(repoRoot) {
  const packagesDir = join(repoRoot, "packages");
  for (const dirent of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const dist = join(packagesDir, dirent.name, "dist");
    if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
  }
}

module.exports = { cleanPackagesDist };
