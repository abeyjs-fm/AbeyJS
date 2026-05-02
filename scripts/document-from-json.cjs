/**
 * Genera `{nombre}.g.ts` dentro de **`src/generate/`** del proyecto AbeyJs en el que estés (según `cwd`).
 *
 * - Solo genera si `cwd` está **dentro de una app** que declara `@abeyjs/*` en `package.json` (no la raíz del repo `abeyjs` ni paquetes `@abeyjs/...`).
 * - Sin argumentos: crea **`src/generate/.omega-doc-paste-temp.json`**, intenta abrir el editor (`code --wait`, `EDITOR`, `notepad`…),
 *   pegás/guardás el JSON y en la consola presionás **Enter** para generar el `.g.ts` y borrar el temporal.
 * - Con argumento: ruta a un `.json` existente (igual que antes).
 *
 *   cd examples/MyMiusic
 *   npm run abeyjs:generate:document -- ./doc.json
 *   npm run abeyjs:generate:document
 *
 * Desde la raíz del monorepo **sin** estar en una app → error (no hay `src/generate` válido).
 */
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const readline = require("node:readline/promises");

const TEMP_JSON_NAME = ".omega-doc-paste-temp.json";

function hasOmegaAppDependencies(pkg) {
  const blocks = [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies].filter(Boolean);
  for (const b of blocks) {
    for (const k of Object.keys(b)) {
      if (k.startsWith("@abeyjs/")) return true;
    }
  }
  return false;
}

/**
 * Carpeta de app Vite/AbeyJs: `package.json` con deps `@abeyjs/*`, nombre no es paquete `@abeyjs/…`,
 * no es la raíz del repo (`name`: `abeyjs`), y existe `src/`.
 */
function findOmegaAppRoot(startDir) {
  let d = path.resolve(startDir);
  for (;;) {
    const pkgPath = path.join(d, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        const name = String(pkg.name ?? "");
        if (name === "abeyjs" || name === "abeyjs-monorepo") {
          /* raíz del repositorio AbeyJs — no es una app */
        } else if (!name.startsWith("@abeyjs/") && hasOmegaAppDependencies(pkg)) {
          const srcDir = path.join(d, "src");
          if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
            return d;
          }
        }
      } catch {
        /* ignorar package.json inválido */
      }
    }
    const parent = path.dirname(d);
    if (parent === d) return null;
    d = parent;
  }
}

/** Identificador TS válido a partir del nombre de archivo (sin extensión). */
function tsIdStem(stem) {
  let x = String(stem).replace(/[^a-zA-Z0-9_$]+/g, "_").replace(/_+/g, "_");
  if (/^[0-9]/.test(x)) x = `_${x}`;
  return x || "Generated";
}

function safePropKey(k) {
  return /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
}

function humanizeBinding(binding) {
  const spaced = binding.replace(/([A-Z])/g, " $1").trim();
  if (!spaced) return binding;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function jsonScalarToTs(v) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "string") return "string";
  return "unknown";
}

/** Tipo TS en línea para valores JSON (objetos anidados como tipos inline). */
function valueToInlineTsType(v, depth = 0) {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) {
    if (v.length === 0) return "unknown[]";
    const inner = valueToInlineTsType(v[0], depth + 1);
    return `${inner}[]`;
  }
  if (typeof v === "object") {
    if (depth > 4) return "Record<string, unknown>";
    const entries = Object.entries(v);
    if (entries.length === 0) return "Record<string, never>";
    const inner = entries
      .map(([k, val]) => `  ${safePropKey(k)}: ${valueToInlineTsType(val, depth + 1)};`)
      .join("\n");
    return `{\n${inner}\n}`;
  }
  return jsonScalarToTs(v);
}

function inferLineColumnMeta(binding, sampleVal) {
  const label = humanizeBinding(binding);
  let uiKind = "text";
  /** @type {string | undefined} */
  let lineRule;
  if (typeof sampleVal === "number") {
    uiKind = "number";
    if (binding === "productoId" || binding === "clienteId" || binding === "usuarioId") lineRule = "int";
    else if (binding === "cantidad") lineRule = "positive";
    else lineRule = "nonNegative";
  }
  if (binding === "total") {
    uiKind = "readonly";
    lineRule = "nonNegative";
  }
  if (binding === "descripcion") {
    uiKind = "textarea";
    lineRule = "min1";
  }
  const out = { binding, label, uiKind };
  if (lineRule) out.lineRule = lineRule;
  return out;
}

function buildInterfaces(data, basePascal) {
  const blocks = [];

  const items = data.items;
  const firstItem =
    Array.isArray(items) && items.length > 0 && typeof items[0] === "object" && !Array.isArray(items[0])
      ? items[0]
      : null;

  const pagos = data.pagos;
  const firstPago =
    Array.isArray(pagos) && pagos.length > 0 && typeof pagos[0] === "object" && !Array.isArray(pagos[0])
      ? pagos[0]
      : null;

  const tot = data.totales;
  const hasTotales = tot && typeof tot === "object" && !Array.isArray(tot);

  if (firstItem) {
    const props = Object.entries(firstItem)
      .map(([k, v]) => `  ${safePropKey(k)}: ${valueToInlineTsType(v)};`)
      .join("\n");
    blocks.push(`export interface ${basePascal}LineItem {\n${props}\n}\n`);
  }

  if (firstPago) {
    const props = Object.entries(firstPago)
      .map(([k, v]) => `  ${safePropKey(k)}: ${valueToInlineTsType(v)};`)
      .join("\n");
    blocks.push(`export interface ${basePascal}Pago {\n${props}\n}\n`);
  }

  if (hasTotales) {
    const props = Object.entries(tot)
      .map(([k, v]) => `  ${safePropKey(k)}: ${valueToInlineTsType(v)};`)
      .join("\n");
    blocks.push(`export interface ${basePascal}Totales {\n${props}\n}\n`);
  }

  const rootProps = [];
  for (const [k, v] of Object.entries(data)) {
    if (k === "items" && firstItem) {
      rootProps.push(`  ${safePropKey(k)}: ${basePascal}LineItem[];`);
    } else if (k === "pagos" && firstPago) {
      rootProps.push(`  ${safePropKey(k)}: ${basePascal}Pago[];`);
    } else if (k === "totales" && hasTotales) {
      rootProps.push(`  ${safePropKey(k)}: ${basePascal}Totales;`);
    } else if (k === "items" || k === "pagos" || k === "totales") {
      rootProps.push(`  ${safePropKey(k)}: ${valueToInlineTsType(v)};`);
    } else {
      rootProps.push(`  ${safePropKey(k)}: ${valueToInlineTsType(v)};`);
    }
  }

  blocks.push(`export interface ${basePascal}Document {\n${rootProps.join("\n")}\n}\n`);
  return blocks.join("\n");
}

function buildLineTableJson(firstItem) {
  if (!firstItem) return "[]";
  const cols = Object.keys(firstItem).map((binding) => inferLineColumnMeta(binding, firstItem[binding]));
  return JSON.stringify(cols, null, 2);
}

function buildPagoTableJson(firstPago) {
  if (!firstPago) return "[]";
  const cols = Object.keys(firstPago).map((binding) => inferLineColumnMeta(binding, firstPago[binding]));
  return JSON.stringify(cols, null, 2);
}

/**
 * Heurística para `AbeyFormConfig.fields` (solo raíz, escalares).
 * Omite arrays (`items`, `pagos`, …) y objetos anidados (`totales`, …).
 * @param {string} binding
 * @param {unknown} sampleVal
 * @returns {{ name: string; label: string; kind: string } | null}
 */
function inferRootOmxFormField(binding, sampleVal) {
  const label = humanizeBinding(binding);
  if (sampleVal === null || sampleVal === undefined) {
    return { name: binding, label, kind: "text" };
  }
  if (typeof sampleVal === "boolean") {
    return { name: binding, label, kind: "checkbox" };
  }
  if (typeof sampleVal === "number") {
    return { name: binding, label, kind: "number" };
  }
  if (typeof sampleVal === "string") {
    const lower = binding.toLowerCase();
    if (lower.includes("email") || lower === "mail" || lower.endsWith("correo")) {
      return { name: binding, label, kind: "email" };
    }
    if (
      lower.includes("fecha") ||
      lower.includes("date") ||
      lower.includes("vencimiento") ||
      (/(created|updated|modified|deleted)/.test(lower) && lower.endsWith("at"))
    ) {
      return { name: binding, label, kind: "date" };
    }
    return { name: binding, label, kind: "text" };
  }
  return null;
}

/**
 * @param {Record<string, unknown>} data
 */
function buildRootOmxFormFieldsJson(data) {
  const out = [];
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) continue;
    if (v !== null && typeof v === "object") continue;
    const f = inferRootOmxFormField(k, v);
    if (f) out.push(f);
  }
  return JSON.stringify(out, null, 2);
}

/**
 * Abre el JSON temporal en un editor y espera a que lo cierres (cuando el editor lo permita).
 * @param {string} filePath
 */
function openTempJsonEditor(filePath) {
  const win = process.platform === "win32";
  /** @type {[string, string[]][]} */
  const attempts = [
    ["code", ["--wait", filePath]],
    ["cursor", ["--wait", filePath]],
  ];
  const ed = process.env.EDITOR || process.env.VISUAL;
  if (ed) {
    const parts = ed.split(/\s+/);
    attempts.push([parts[0], [...parts.slice(1), filePath]]);
  }
  if (win) {
    attempts.push(["notepad.exe", [filePath]]);
  } else {
    attempts.push(["nano", [filePath]]);
  }

  for (const [cmd, args] of attempts) {
    try {
      const gui = cmd === "code" || cmd === "cursor" || cmd === "notepad.exe";
      const r = cp.spawnSync(cmd, args, {
        /* Evitar que el hijo comparta stdin con readline (deja la consola “colgada” tras Enter). */
        stdio: gui ? ["ignore", "inherit", "inherit"] : "inherit",
        shell: win,
        windowsHide: false,
      });
      if (r.error && r.error.code === "ENOENT") continue;
      return;
    } catch {
      continue;
    }
  }
  console.log(
    `\nNo se pudo abrir un editor automático. Editá el archivo manualmente y volvé a ejecutar el comando,\n  o definí EDITOR en el entorno. Archivo:\n  ${filePath}\n`,
  );
}

async function main() {
  const cwd = process.cwd();
  const appRoot = findOmegaAppRoot(cwd);
  if (!appRoot) {
    console.error(
      [
        "No se detectó un proyecto de aplicación AbeyJs.",
        "  Requisitos: estar en (o debajo de) una carpeta con package.json que use @abeyjs/* y que tenga src/.",
        "  Ejemplo: cd examples/MyMiusic",
        "  No se usa la raíz del repositorio (package `abeyjs`) ni paquetes @abeyjs/... bajo packages/.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const generateDir = path.join(appRoot, "src", "generate");
  fs.mkdirSync(generateDir, { recursive: true });

  const raw = process.argv.slice(2);
  let fileArg;
  let nameOverride;
  let minimal = false;
  let emitRootFields = true;
  let emitHtmlSnippet = true;
  let emitSample = true;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === "--name" && raw[i + 1]) {
      nameOverride = raw[i + 1];
      i += 1;
      continue;
    }
    if (raw[i] === "--minimal") {
      minimal = true;
      continue;
    }
    if (raw[i] === "--no-root-fields") {
      emitRootFields = false;
      continue;
    }
    if (raw[i] === "--no-html-snippet") {
      emitHtmlSnippet = false;
      continue;
    }
    if (raw[i] === "--no-sample") {
      emitSample = false;
      continue;
    }
    if (raw[i] && !raw[i].startsWith("-")) {
      fileArg = raw[i];
    }
  }
  if (minimal) {
    emitRootFields = false;
    emitHtmlSnippet = false;
    emitSample = false;
  }

  /** @type {string} */
  let rawJson;
  /** @type {string} */
  let originLabel;
  /** @type {string | null} */
  let tempJsonPath = null;

  if (fileArg) {
    const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(cwd, fileArg);
    if (!fs.existsSync(abs)) {
      console.error(`No existe el archivo: ${abs}`);
      process.exit(1);
    }
    rawJson = fs.readFileSync(abs, "utf8").replace(/^\uFEFF/, "");
    originLabel = abs;
  } else {
    const rl1 = readline.createInterface({ input: process.stdin, output: process.stdout });
    let hint;
    try {
      hint = await rl1.question(
        "Ruta a un .json (desde cwd), o Enter para abrir un archivo temporal y pegar ahí el JSON: ",
      );
    } finally {
      rl1.close();
    }

    const trimmed = String(hint ?? "")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (trimmed) {
      const abs = path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed);
      if (!fs.existsSync(abs)) {
        console.error(`No existe el archivo: ${abs}`);
        process.exit(1);
      }
      rawJson = fs.readFileSync(abs, "utf8").replace(/^\uFEFF/, "");
      originLabel = abs;
    } else {
      tempJsonPath = path.join(generateDir, TEMP_JSON_NAME);
      const starter = `{}\n`;
      fs.writeFileSync(tempJsonPath, starter, "utf8");
      console.log(
        [
          "",
          "→ Se creó un JSON temporal. Reemplazá el contenido {} por tu documento (un solo objeto raíz) y guardá.",
          `   ${tempJsonPath}`,
          "",
        ].join("\n"),
      );
      openTempJsonEditor(tempJsonPath);

      /* Reanudar stdin por si el proceso hijo lo dejó en pausa / raw (evita que Enter “no haga nada”). */
      try {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
      } catch {
        /* ignorar */
      }
      try {
        process.stdin.resume();
      } catch {
        /* ignorar */
      }

      /* Nuevo readline después del editor: el anterior ya se cerró; code/cursor no heredan stdin. */
      const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
      let cont;
      try {
        cont = await rl2.question(
          "Cuando hayas guardado el JSON en ese archivo, presioná Enter para generar (q = cancelar): ",
        );
      } finally {
        rl2.close();
      }
      if (String(cont).trim().toLowerCase() === "q") {
        console.log("Cancelado.");
        if (tempJsonPath && fs.existsSync(tempJsonPath)) {
          try {
            fs.unlinkSync(tempJsonPath);
          } catch {
            /* ignorar */
          }
        }
        process.exit(0);
      }
      rawJson = fs.readFileSync(tempJsonPath, "utf8").replace(/^\uFEFF/, "");
      originLabel = tempJsonPath;
    }
  }

  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(rawJson);
  } catch (e) {
    console.error("JSON inválido:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.error("El JSON debe ser un objeto en la raíz.");
    process.exit(1);
  }

  if (Object.keys(data).length === 0) {
    console.error(
      "El JSON raíz está vacío {}. Pegá tu documento real en el temporal (o en el archivo) y guardá.",
    );
    process.exit(1);
  }

  let stem = nameOverride?.trim();
  if (!stem) {
    if (fileArg) {
      stem = path.basename(fileArg, path.extname(fileArg));
    } else if (tempJsonPath && originLabel === tempJsonPath) {
      const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        const asked = await rl2.question(
          "Nombre base del archivo .g.ts (ej. pedido-api) [documento-generado]: ",
        );
        stem = asked.trim() || "documento-generado";
      } finally {
        rl2.close();
      }
    } else {
      stem = path.basename(originLabel, path.extname(originLabel));
    }
  }

  const words = String(stem).split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const basePascal =
    words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("") || "Generated";
  const idStem = tsIdStem(stem);
  const outPath = path.join(generateDir, `${stem}.g.ts`);

  const items = data.items;
  const firstItem =
    Array.isArray(items) && items.length > 0 && typeof items[0] === "object" && !Array.isArray(items[0])
      ? items[0]
      : null;
  const pagos = data.pagos;
  const firstPago =
    Array.isArray(pagos) && pagos.length > 0 && typeof pagos[0] === "object" && !Array.isArray(pagos[0])
      ? pagos[0]
      : null;

  const lineColsJson = buildLineTableJson(firstItem);
  const pagoColsJson = buildPagoTableJson(firstPago);

  const sampleLiteral = JSON.stringify(data, null, 2);

  const header = `/* eslint-disable */
/**
 * AUTO-GENERADO — no editar a mano.
 * Origen: ${originLabel}
 * App AbeyJs: ${appRoot}
 * cwd al generar: ${cwd}
 */

`;

  const body = `${buildInterfaces(data, basePascal)}
${
  emitSample
    ? `/** Muestra del documento (misma forma que \`${basePascal}Document\`). */
export const ${idStem}Sample = ${sampleLiteral} satisfies ${basePascal}Document;
`
    : ""
}

/**
 * Columnas sugeridas para rejilla de líneas (\`items[]\`), derivadas de \`items[0]\`.
 * Útil como base para meta UI / Zod (AbeyJs documento, no OpenAPI CRUD).
 */
export const ${idStem}LineTableColumnsJson = ${lineColsJson} as const;

${
  firstPago
    ? `/**
 * Columnas sugeridas para tabla de \`pagos[]\`, derivadas de \`pagos[0]\`.
 */
export const ${idStem}PagoTableColumnsJson = ${pagoColsJson} as const;
`
    : ""
}
${
  emitRootFields
    ? `/**
 * Campos raíz sugeridos para \`AbeyFormConfig.fields\` en \`<abey-form>\`: solo propiedades escalares del JSON.
 * Sin \`items\`/\`pagos\` (rejillas) ni objetos anidados (\`totales\`, …). Tipá como \`ViewField[]\` al importar.
 */
export const ${idStem}OmxRootFormFieldsJson = ${buildRootOmxFormFieldsJson(data)} as const;
`
    : ""
}

/** Mismo valor que \`data-abey-document\` en \`<abey-form>\` (importar en invoice-form.schema como \`INVOICE_OMX_FORM_DATA_DOCUMENT\`). */
export const OMEGA_DOC_FORM_DOCUMENT_ID = "${basePascal}Document" as const;

${
  emitHtmlSnippet
    ? `/**
 * Bloque listo para pegar en \`invoice.view.html\` (reemplazá el \`<abey-form>\` actual).
 * En \`invoice.ts\`, en \`mountReactive\`, añadí: \`invoiceOmoxDocumentId: () => INVOICE_OMX_FORM_DATA_DOCUMENT\`.
 */
export const OMEGA_DOC_FORM_HTML_SNIPPET = ${JSON.stringify(
        [
          "<abey-form",
          '  id="invoiceForm"',
          '  class="abey-invoice__form"',
          '  runtimepath="__abeyRuntime"',
          "  data-abey-document=\"{{invoiceOmoxDocumentId}}\"",
          "></abey-form>",
        ].join("\n"),
      )} as const;
`
    : ""
}
`;
  fs.writeFileSync(outPath, header + body, "utf8");
  if (tempJsonPath && fs.existsSync(tempJsonPath)) {
    try {
      fs.unlinkSync(tempJsonPath);
    } catch {
      /* ignorar */
    }
  }
  console.log(`Proyecto AbeyJs: ${appRoot}`);
  console.log(`Escrito: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
