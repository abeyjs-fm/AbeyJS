/**
 * Crea un ejemplo bajo `examples/<nombre>` con la plantilla del CLI: mismos estilos
 * que `templates/admin` (`@abeyjs/view/theme/omega-default.css` en `src/main.ts`).
 *
 *   npm run example:scaffold -- mi-app
 *   npm run example:scaffold -- otra --template empty
 *   npm run example:scaffold -- admin-demo --template admin --shell appbar
 */
const { execFileSync } = require("node:child_process");
const { existsSync, readdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const raw = process.argv.slice(2);
let template = "admin";
let shell = "dashboard";
let name;
for (let i = 0; i < raw.length; i += 1) {
  if (raw[i] === "--template" && raw[i + 1]) {
    const t = raw[i + 1];
    if (t === "admin" || t === "abeyjs" || t === "empty" || t === "minimal") {
      template = t === "empty" ? "abeyjs" : t;
    } else {
      // eslint-disable-next-line no-console
      console.error("Usa: --template admin|abeyjs|empty|minimal");
      process.exit(1);
    }
    i += 1;
    continue;
  }
  if (raw[i] === "--shell" && raw[i + 1]) {
    const s = raw[i + 1];
    if (s === "dashboard" || s === "appbar") {
      shell = s;
    } else {
      // eslint-disable-next-line no-console
      console.error("Usa: --shell dashboard|appbar");
      process.exit(1);
    }
    i += 1;
    continue;
  }
  if (raw[i] && !raw[i].startsWith("-") && !name) {
    name = raw[i];
  }
}
if (!name) {
  // eslint-disable-next-line no-console
  console.error("Uso: npm run example:scaffold -- <nombre> [--template admin|abeyjs|empty|minimal] [--shell dashboard|appbar]\n  Ej: npm run example:scaffold -- mi-app  (admin+shell dashboard = barra+sidebar+contenido)");

  process.exit(1);
}
if (name.startsWith("-") || /[/\\]/.test(name)) {
  // eslint-disable-next-line no-console
  console.error("El nombre no puede contener / ni \\.");
  process.exit(1);
}

const target = join(root, "examples", name);
if (existsSync(target) && readdirSync(target).length > 0) {
  // eslint-disable-next-line no-console
  console.error("Esa carpeta en examples/ ya existe y no está vacía:", target);
  process.exit(1);
}

const cli = join(root, "packages", "cli", "dist", "cli.js");
if (!existsSync(cli)) {
  // eslint-disable-next-line no-console
  console.error("Compila el CLI primero: npm run build  (hace falta @abeyjs/cli en dist)\n  ", cli);
  process.exit(1);
}

const initArgs = [cli, "init", target, "--template", template, "--shell", shell];
execFileSync(process.execPath, initArgs, { stdio: "inherit", cwd: root });

const pkgPath = join(target, "package.json");
let pkgName = name;
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const scope = String(name)
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  pkgName = scope ? `@abeyjs/example-${scope}` : "@abeyjs/example-app";
  pkg.name = pkgName;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

const readme = join(target, "README.md");
if (!existsSync(readme)) {
  writeFileSync(
    readme,
    [
      `# \`${pkgName}\` — examples/${name}`,
      "",
      "Generada con el CLI (`plantilla **" + template + "**`). Los **estilos** vienen de la plantilla: se importa `@abeyjs/view/theme/omega-default.css` en `src/main.ts` (misma piel `abey-*` que el resto de ejemplos).",
      "",
      "```bash",
      "cd examples/" + name,
      "npm i",
      "npm run dev",
      "```",
      "",
      "Rutas: `src/routes.ts` · `src/omegaSetup.ts`",
    ].join("\n") + "\n",
    "utf8",
  );
}

// eslint-disable-next-line no-console
console.log("Añadida examples/" + name + " (workspace " + pkgName + "). Tras añadir paquetes: npm i en la raíz del monorepo.");
