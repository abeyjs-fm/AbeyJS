#!/usr/bin/env node
/** AbeyJs CLI — project scaffolding, OpenAPI wiring, view/ecosystem generators. */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import openapiTS, { astToString, COMMENT_HEADER, type OpenAPITSOptions } from "openapi-typescript";
import { addOpenapiToApp } from "./openapi-add-wires.js";
import { runConnect } from "./openapi-connect.js";
import { listCrudCandidates, runGenerateViewsWithOptions, type ScaffoldMode } from "./openapi-generate-views.js";
import {
  buildEcosystemWireInstructions,
  runGenerateEcosystem,
} from "./generate-ecosystem.js";

/** `package.json` next to this file (`dist/` → package root). */
function getCliVersion(): string {
  try {
    const pkgDir = fileURLToPath(new URL("..", import.meta.url));
    const raw = readFileSync(join(pkgDir, "package.json"), "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function npmExecutable(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function tryNpmVersion(): string {
  const ua = process.env.npm_config_user_agent ?? "";
  const fromUa = ua.match(/\bnpm\/([^\s]+)/);
  if (fromUa) {
    return fromUa[1]!;
  }
  const cmd = npmExecutable();
  try {
    return execFileSync(cmd, ["-v"], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    try {
      return execFileSync("npm", ["-v"], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return "n/a";
    }
  }
}

function envSkipsScaffoldInstall(): boolean {
  const v = process.env.SKIP_ABEYJS_SCAFFOLD_INSTALL?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Runs `npm install` in `projectDir` (stdio inherited). */
async function runNpmInstall(projectDir: string): Promise<void> {
  // Windows: spawning `npm.cmd` with `shell: false` often fails with EINVAL; use the shell so PATH resolves npm.
  const win = process.platform === "win32";
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["install", "--no-fund", "--no-audit"], {
      cwd: projectDir,
      stdio: "inherit",
      env: process.env,
      shell: win,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install exited with code ${code ?? "unknown"}`));
      }
    });
  });
}

async function maybeRunPostScaffoldInstall(projectDir: string, cliSkip: boolean): Promise<void> {
  if (cliSkip || envSkipsScaffoldInstall()) {
    // eslint-disable-next-line no-console
    console.log("Skipping npm install (--skip-install or SKIP_ABEYJS_SCAFFOLD_INSTALL=1).");
    return;
  }
  // eslint-disable-next-line no-console
  console.log("Installing dependencies (npm install)…");
  await runNpmInstall(projectDir);
  // eslint-disable-next-line no-console
  console.log("npm install finished.");
}

function findNearestPackageJson(startDir: string): { path: string; root: string } | null {
  let dir = resolve(startDir);
  for (let i = 0; i < 14; i += 1) {
    const p = join(dir, "package.json");
    if (existsSync(p)) {
      return { path: p, root: dir };
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

function mergeDepBlocks(pkg: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ["dependencies", "devDependencies", "optionalDependencies"] as const) {
    const block = pkg[key];
    if (block && typeof block === "object") {
      for (const [k, v] of Object.entries(block as Record<string, unknown>)) {
        if (typeof v === "string") {
          out[k] = v;
        }
      }
    }
  }
  return out;
}

/** Walk parents from `startDir` looking for `node_modules/@abeyjs/<name>/package.json`. */
function installedAbeyVersion(startDir: string, packageName: string): string | null {
  const short = packageName.replace(/^@abeyjs\//, "");
  let dir = resolve(startDir);
  for (let i = 0; i < 16; i += 1) {
    const manifest = join(dir, "node_modules", "@abeyjs", short, "package.json");
    if (existsSync(manifest)) {
      try {
        const j = JSON.parse(readFileSync(manifest, "utf-8")) as { version?: string };
        if (typeof j.version === "string") {
          return j.version;
        }
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

/** When package.json has no @abeyjs deps (e.g. npm workspaces root), list `node_modules/@abeyjs/*`. */
function installedAbeyPackagesFromNodeModules(root: string): { pkg: string; ver: string }[] {
  const base = join(resolve(root), "node_modules", "@abeyjs");
  if (!existsSync(base)) {
    return [];
  }
  const out: { pkg: string; ver: string }[] = [];
  for (const name of readdirSync(base)) {
    if (name === "." || name === ".." || name.startsWith(".")) {
      continue;
    }
    const manifest = join(base, name, "package.json");
    if (!existsSync(manifest)) {
      continue;
    }
    try {
      const j = JSON.parse(readFileSync(manifest, "utf-8")) as { version?: string };
      if (typeof j.version === "string") {
        out.push({ pkg: `@abeyjs/${name}`, ver: j.version });
      }
    } catch {
      /* ignore */
    }
  }
  out.sort((a, b) => a.pkg.localeCompare(b.pkg));
  return out;
}

/** `ng version`-style block: environment + optional workspace table. */
function buildVersionReport(): string {
  const labelW = 22;
  const lab = (s: string) => s.padEnd(labelW);
  const lines: string[] = [""];

  lines.push(`${lab("AbeyJs CLI:")}${getCliVersion()}`);
  lines.push(`${lab("Node:")}${process.version}`);
  lines.push(`${lab("Package Manager:")}npm ${tryNpmVersion()}`);
  lines.push(`${lab("OS:")}${os.platform()} ${os.arch()}`);
  lines.push("");

  const hit = findNearestPackageJson(process.cwd());
  if (!hit) {
    lines.push(`${lab("Workspace:")}(no package.json in this folder or parents)`);
    lines.push("");
    lines.push("Package".padEnd(36) + "Version");
    lines.push("-".repeat(56));
    lines.push("@abeyjs/cli".padEnd(36) + getCliVersion() + "  (this executable)");
    lines.push("");
    return lines.join("\n");
  }

  let pkgRaw: Record<string, unknown> = {};
  try {
    pkgRaw = JSON.parse(readFileSync(hit.path, "utf-8")) as Record<string, unknown>;
  } catch {
    /* */
  }
  const wsName = typeof pkgRaw.name === "string" ? pkgRaw.name : "(unnamed)";
  lines.push(`${lab("Workspace:")}${wsName}`);
  lines.push(`${lab("Path:")}${hit.root}`);

  const deps = mergeDepBlocks(pkgRaw);
  const abeyKeys = Object.keys(deps).filter((k) => k.startsWith("@abeyjs/")).sort();
  const rt = installedAbeyVersion(hit.root, "@abeyjs/runtime");
  const cr = installedAbeyVersion(hit.root, "@abeyjs/core");
  lines.push(`${lab("@abeyjs/runtime:")}${rt ?? "—"}`);
  lines.push(`${lab("@abeyjs/core:")}${cr ?? "—"}`);
  const fromNm = installedAbeyPackagesFromNodeModules(hit.root);
  if (abeyKeys.length === 0 && fromNm.length === 0) {
    lines.push(`${lab("Declared @abeyjs/*:")}(none in package.json)`);
  } else if (abeyKeys.length === 0 && fromNm.length > 0) {
    lines.push(`${lab("Declared @abeyjs/*:")}(none — listing linked node_modules/@abeyjs/*)`);
  }
  lines.push("");

  const rows: { pkg: string; ver: string }[] = [{ pkg: "@abeyjs/cli", ver: `${getCliVersion()}  (this executable)` }];
  const seen = new Set<string>(["@abeyjs/cli"]);
  for (const k of abeyKeys) {
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    const installed = installedAbeyVersion(hit.root, k);
    const ver = installed ?? deps[k] ?? "?";
    rows.push({ pkg: k, ver });
  }
  if (abeyKeys.length === 0) {
    for (const { pkg, ver } of fromNm) {
      if (seen.has(pkg)) {
        continue;
      }
      seen.add(pkg);
      rows.push({ pkg, ver });
    }
  }

  const colW = Math.max(28, ...rows.map((r) => r.pkg.length), "Package".length) + 2;
  lines.push("Package".padEnd(colW) + "Version");
  lines.push("-".repeat(Math.min(72, colW + 24)));
  for (const r of rows) {
    lines.push(r.pkg.padEnd(colW) + r.ver);
  }
  lines.push("");
  return lines.join("\n");
}

/** Richer help on terminals; plain text if NO_COLOR or not a TTY. */
function buildHelp(): string {
  const tty = process.stdout.isTTY && !process.env.NO_COLOR;
  const b = (s: string) => (tty ? `\x1b[1m${s}\x1b[0m` : s);
  const d = (s: string) => (tty ? `\x1b[2m${s}\x1b[0m` : s);
  const c = (s: string) => (tty ? `\x1b[36m${s}\x1b[0m` : s);
  const nl = "\n";

  const lines: string[] = [
    "",
    `${b("AbeyJs CLI")}  ${d("scaffold · OpenAPI · codegen")}`,
    "",
    `${d("Usage")}`,
    `  ${c("abeyjs")} <command> [options]`,
    "",
    `${b("Projects")}  ${d("new, init, create — same behavior")}`,
    `  ${c("abeyjs init")} <folder> [options]`,
    `  ${c("abeyjs new")}   <folder> [options]     ${d("alias")}`,
    `  ${c("abeyjs create")} <folder> [options]    ${d("alias")}`,
    "",
    `    ${d("Options")}`,
    `      --template ${c("admin")} | ${c("abeyjs")} | ${c("empty")} | ${c("minimal")}   ${d("or")} ${c("--template=admin")}`,
    `        ${d("abeyjs")} and ${d("empty")} are the same Vite + OM starter (${d("templates/empty")}).`,
    `        ${d("admin")} is the dashboard shell; ${d("minimal")} is a tiny workspace (${d("@abeyjs/core")} only).`,
    `      ${c("--admin")}             ${d("shorthand for")} ${c("--template admin")}`,
    `      --shell ${c("dashboard")} | ${c("appbar")}     ${d("only with --template admin")}   ${d("or")} ${c("--shell=dashboard")}`,
    `      ${c("--skip-install")}     ${d("Skip automatic npm install after scaffold.")}`,
    "",
    `    ${d("Runs")} ${c("npm install")} ${d("in the new project unless")} ${c("--skip-install")} ${d("or")} SKIP_ABEYJS_SCAFFOLD_INSTALL=1.`,
    `    ${d("Examples")}  ${c("abeyjs init")} my-app ${c("--template admin")}   ·   ${c("abeyjs init")} my-app ${c("--admin")}`,
    "",
    `${b("OpenAPI in an existing app")}`,
    `  ${c("abeyjs add openapi")} <folder>`,
    `      [--proxy <url>]  [--openapi-path <path>]  [--skip-install]`,
    "",
    `    ${d("Adds")} @abeyjs/openapi, @abeyjs/http, Vite proxies, .env.example, omegaSetup stubs, sample CRUD route.`,
    `    ${d("Runs")} ${c("npm install")} ${d("after patching unless")} ${c("--skip-install")} ${d("or")} SKIP_ABEYJS_SCAFFOLD_INSTALL=1.`,
    `    ${d("Defaults")}  --proxy https://127.0.0.1:7019   --openapi-path /swagger/v1/swagger.json`,
    "",
    `${b("OpenAPI contract → repo")}`,
    `  ${c("abeyjs connect")} <swagger-url> [--target <folder>]`,
    "",
    `    ${d("Writes")} .abeyjs/connect.json ${d("and")} abeyjs.connect.yml.  ${d("Use")} --insecure ${d("for dev TLS.")}`,
    "",
    `${b("Generate CRUD UI")}  ${d("after connect")}`,
    `  ${c("abeyjs generate views")} [--target <folder>]`,
    `      [--scaffold minimal|full]  [--full-scaffold]`,
    "",
    `    ${d("Requires")} abeyjs connect ${d("first.")}  ${d("full")} adds src/app, src/ui, src/infra layers.`,
    "",
    `${b("Feature slice (ecosystem)")}`,
    `  ${c("abeyjs generate ecosystem")} <Name> [--feature-root <path>] [--target <folder>]`,
    `      [--show-nav] | [--no-show-nav]   ${d("sidebar entry; default ask in TTY, else visible")}`,
    `  ${c("abeyjs g ecosystem")} <Name> ...                    ${d("alias")}`,
    "",
    `    ${d("Creates")} ui/ + omega/ ${d("under the feature; may patch")} omegaSetup.ts ${d("and")} routes.ts.`,
    "",
    `${b("Codegen only")}`,
    `  ${c("abeyjs codegen")} <openapi.json|yaml>  -o|--out <dir>`,
    "",
    `    ${d("Writes")} api-types.ts ${d("and")} omegaSetup.generated.ts ${d("stub.")}`,
    "",
    `${b("Help")}`,
    `  ${c("abeyjs help")}   ${d("or")}   abeyjs --help   ${d("or")}   abeyjs -h`,
    `  ${c("abeyjs version")}           ${d("full report (env + workspace @abeyjs/*)")}`,
    `  ${c("abeyjs --version")} | -v   ${d("semver only (good for scripts)")}`,
    "",
  ];
  return lines.join(nl);
}

type Spec = { paths?: Record<string, unknown>; openapi?: string; swagger?: string; info?: { title?: string } };

function generateStub(spec: Spec, partialYamlNote: boolean): string {
  const pathKeys = spec.paths ? Object.keys(spec.paths).slice(0, 24) : [];
  const list = pathKeys.length
    ? pathKeys.map((k) => `  //   ${k}`).join("\n")
    : "  //   (no path list — " + (partialYamlNote ? "YAML: wire paths in omegaSetup.ts" : "empty spec") + ")";
  const version = spec.openapi ?? spec.swagger;
  return `/**
 * AUTO-GENERATED by \`abeyjs codegen\` — import from your omegaSetup.ts
 */
import { createOmegaRuntime, type OmegaRuntime } from '@abeyjs/runtime';

/** Central registration stub — extend with intents, HTTP, and agents in omegaSetup.ts. */
export function omegaSetupGenerated(): OmegaRuntime {
  const runtime = createOmegaRuntime();
  // ${spec.info?.title ? `API: ${spec.info.title}` : "API: (name from OpenAPI not loaded)"} ${version ? ` — ${version}` : ""}
  // OpenAPI path hints (register intents and HTTP in your app):
${list}
  // runtime.onIntent("Resource/List", (payload, ctx) => { ... });
  return runtime;
}
`;
}

type InitTemplate = "admin" | "abeyjs" | "minimal";
type InitShell = "dashboard" | "appbar";

/** Strips accidental leading `--` (e.g. user passes `--template --admin`). */
function normalizeInitTemplate(raw: string): InitTemplate | null {
  const t = raw.trim().replace(/^--+/u, "");
  if (t === "admin" || t === "minimal") return t;
  if (t === "empty" || t === "abeyjs") return "abeyjs";
  return null;
}

function normalizeInitShell(raw: string): InitShell | null {
  const s = raw.trim().replace(/^--+/u, "");
  return s === "dashboard" || s === "appbar" ? s : null;
}

function toWorkspaceSafePackageName(raw: string): string {
  const base = raw.trim().toLowerCase();
  const cleaned = base
    .replace(/[/\\]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  // npm package name constraints are stricter, but this is "good enough" for workspace uniqueness.
  return cleaned.length > 0 ? cleaned : "abeyjs-app";
}

async function patchPackageJsonName(targetDir: string, nameHint: string): Promise<void> {
  const pkgPath = join(targetDir, "package.json");
  try {
    const raw = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    pkg.name = toWorkspaceSafePackageName(nameHint);
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  } catch {
    // If parsing fails or file missing, do nothing.
  }
}

type ParseResult =
  | { kind: "help" }
  | { kind: "version"; mode: "short" | "long" }
  | { kind: "codegen"; openapi: string; out: string }
  | { kind: "init"; target?: string; template: InitTemplate; shell: InitShell; skipInstall: boolean }
  | { kind: "addOpenapi"; target: string; proxy: string; openApiPath: string; skipInstall: boolean }
  | { kind: "connect"; swaggerUrl: string; target: string; insecure: boolean }
  | { kind: "generateViews"; target: string; scaffold: ScaffoldMode }
  | { kind: "generateEcosystem"; name: string; featureRoot?: string; target: string; showInNav?: boolean }
  | { kind: "initSyntaxErr"; message: string }
  | { kind: "err" };

function parseInitTemplate(a: string[]): {
  template: InitTemplate;
  shell: InitShell;
  rest: string[];
  target?: string;
  skipInstall: boolean;
  initError?: string;
} {
  const rest: string[] = [];
  let template: InitTemplate = "abeyjs";
  let shell: InitShell = "dashboard";
  let target: string | undefined;
  let skipInstall = false;
  let initError: string | undefined;

  function setInitError(msg: string): void {
    if (!initError) initError = msg;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === "--skip-install") {
      skipInstall = true;
      continue;
    }
    if (a[i] === "--admin") {
      template = "admin";
      continue;
    }
    if (a[i]?.startsWith("--template=")) {
      const raw = a[i]!.slice("--template=".length);
      const t = normalizeInitTemplate(raw);
      if (t !== null) {
        template = t;
        continue;
      }
      setInitError(`Invalid --template value ${JSON.stringify(raw)}. Expected admin, empty, abeyjs, minimal. Example: abeyjs init my-app --template admin`);
      continue;
    }
    if (a[i] === "--template" && a[i + 1]) {
      const raw = a[i + 1]!;
      const t = normalizeInitTemplate(raw);
      if (t !== null) {
        template = t;
        i += 1;
        continue;
      }
      setInitError(
        `Invalid --template value ${JSON.stringify(raw)}. Expected admin, empty, abeyjs, minimal (not "--admin" twice — use: abeyjs init my-app --template admin).`,
      );
      i += 1;
      continue;
    }
    if (a[i]?.startsWith("--shell=")) {
      const raw = a[i]!.slice("--shell=".length);
      const s = normalizeInitShell(raw);
      if (s !== null) {
        shell = s;
        continue;
      }
      setInitError(`Invalid --shell value ${JSON.stringify(raw)}. Expected dashboard or appbar.`);
      continue;
    }
    if (a[i] === "--shell" && a[i + 1]) {
      const raw = a[i + 1]!;
      const s = normalizeInitShell(raw);
      if (s !== null) {
        shell = s;
        i += 1;
        continue;
      }
      setInitError(`Invalid --shell value ${JSON.stringify(raw)}. Expected dashboard or appbar.`);
      i += 1;
      continue;
    }
    if (a[i] === "--target" && a[i + 1]) {
      target = a[i + 1]!;
      i += 1;
      continue;
    }
    if (a[i]?.startsWith("--target=")) {
      target = a[i]!.slice("--target=".length);
      continue;
    }
    rest.push(a[i]!);
  }
  return { template, shell, rest, target, skipInstall, initError };
}

function parseArgs(argv: string[]): ParseResult {
  const a = argv.slice(2);
  if (a[0] === "--version" || a[0] === "-v" || a[0] === "-V") {
    return { kind: "version", mode: "short" };
  }
  if (a[0] === "version") {
    return { kind: "version", mode: "long" };
  }
  if (a.length === 0 || a[0] === "help" || a[0] === "--help" || a[0] === "-h") {
    return { kind: "help" };
  }
  if (a[0] === "init" || a[0] === "new" || a[0] === "create") {
    const parsed = parseInitTemplate(a.slice(1));
    if (parsed.initError) {
      return { kind: "initSyntaxErr", message: parsed.initError };
    }
    const fromArg = parsed.target ?? parsed.rest[0];
    const fromNpmConfig = process.env.npm_config_target;
    return {
      kind: "init",
      target: fromArg ?? fromNpmConfig,
      template: parsed.template,
      shell: parsed.shell,
      skipInstall: parsed.skipInstall,
    };
  }
  if (a[0] === "add" && a[1] === "openapi") {
    const fromPositional = a[2] && !a[2].startsWith("--") ? a[2] : undefined;
    const target = fromPositional ?? process.env.npm_config_target ?? ".";
    let proxy = process.env.npm_config_proxy ?? "https://127.0.0.1:7019";
    let openApiPath = process.env.npm_config_openapi_path ?? "/swagger/v1/swagger.json";
    let skipInstall = false;
    for (let k = fromPositional ? 3 : 2; k < a.length; k += 1) {
      if (a[k] === "--skip-install") {
        skipInstall = true;
        continue;
      }
      if (a[k] === "--proxy" && a[k + 1]) {
        proxy = a[k + 1]!;
        k += 1;
        continue;
      }
      if (a[k] === "--openapi-path" && a[k + 1]) {
        openApiPath = a[k + 1]!;
        k += 1;
        continue;
      }
    }
    return { kind: "addOpenapi", target, proxy, openApiPath: normalizeOpenApiPath(openApiPath), skipInstall };
  }
  if (a[0] === "codegen") {
    const openapi = a[1]!;
    const oIdx = a.indexOf("-o");
    const outIdx = a.indexOf("--out");
    const i = oIdx >= 0 ? oIdx : outIdx;
    if (openapi && i >= 0 && a[i + 1]) {
      return { kind: "codegen", openapi, out: a[i + 1]! };
    }
    return { kind: "err" };
  }
  if (a[0] === "connect") {
    let target = process.env.npm_config_target ?? ".";
    let insecure = false;
    let swaggerUrl: string | undefined;
    for (let i = 1; i < a.length; i += 1) {
      const arg = a[i]!;
      if (!arg.startsWith("--") && swaggerUrl == null) {
        swaggerUrl = arg;
        continue;
      }
      if (a[i] === "--target" && a[i + 1]) {
        target = a[i + 1]!;
        i += 1;
        continue;
      }
      if (a[i]?.startsWith("--target=")) {
        target = a[i]!.slice("--target=".length);
        continue;
      }
      if (a[i] === "--insecure") {
        insecure = true;
        continue;
      }
    }
    if (swaggerUrl) {
      return { kind: "connect", swaggerUrl, target, insecure };
    }
    return { kind: "err" };
  }
  if (
    (a[0] === "generate" && a[1] === "ecosystem") ||
    (a[0] === "g" && a[1] === "ecosystem")
  ) {
    const tokens = a.slice(2);
    let target = process.env.npm_config_target ?? ".";
    let featureRoot: string | undefined;
    let name: string | undefined;
    let showInNav: boolean | undefined;
    for (let i = 0; i < tokens.length; i += 1) {
      const t = tokens[i]!;
      if (t === "--target" && tokens[i + 1]) {
        target = tokens[i + 1]!;
        i += 1;
        continue;
      }
      if (t.startsWith("--target=")) {
        target = t.slice("--target=".length);
        continue;
      }
      if (t === "--feature-root" && tokens[i + 1]) {
        featureRoot = tokens[i + 1]!;
        i += 1;
        continue;
      }
      if (t.startsWith("--feature-root=")) {
        featureRoot = t.slice("--feature-root=".length);
        continue;
      }
      if (t === "--show-nav") {
        showInNav = true;
        continue;
      }
      if (t === "--no-show-nav" || t === "--hide-nav") {
        showInNav = false;
        continue;
      }
      if (!t.startsWith("--") && name == null) {
        name = t;
      }
    }
    if (name) {
      return { kind: "generateEcosystem", name, featureRoot, target, showInNav };
    }
    return { kind: "err" };
  }
  if (a[0] === "generate" && a[1] === "views") {
    let target = process.env.npm_config_target ?? ".";
    let scaffold: ScaffoldMode = "minimal";
    for (let i = 2; i < a.length; i += 1) {
      if (a[i] === "--target" && a[i + 1]) {
        target = a[i + 1]!;
        i += 1;
        continue;
      }
      if (a[i]?.startsWith("--target=")) {
        target = a[i]!.slice("--target=".length);
        continue;
      }
      if (a[i] === "--full-scaffold") {
        scaffold = "full";
        continue;
      }
      if (a[i] === "--scaffold" && a[i + 1]) {
        const s = a[i + 1]!;
        if (s === "minimal" || s === "full") {
          scaffold = s;
        }
        i += 1;
        continue;
      }
      if (a[i]?.startsWith("--scaffold=")) {
        const s = a[i]!.slice("--scaffold=".length);
        if (s === "minimal" || s === "full") {
          scaffold = s;
        }
        continue;
      }
    }
    return { kind: "generateViews", target, scaffold };
  }
  return { kind: "help" };
}

const opts: OpenAPITSOptions = { exportType: true };

function resolveFromInvocationDir(inputPath: string): string {
  if (isAbsolute(inputPath)) {
    return inputPath;
  }
  const invokedFrom = process.env.INIT_CWD?.trim();
  return resolve(invokedFrom && invokedFrom.length > 0 ? invokedFrom : process.cwd(), inputPath);
}

function normalizeOpenApiPath(rawPath: string): string {
  const p = rawPath.trim();
  if (p.startsWith("/")) {
    return p;
  }
  const swaggerIdx = p.toLowerCase().indexOf("/swagger/");
  if (swaggerIdx >= 0) {
    return p.slice(swaggerIdx);
  }
  return p;
}

async function askProjectName(): Promise<string> {
  if (!input.isTTY || !output.isTTY) {
    throw new Error("Missing project name. Non-interactive mode: abeyjs init <folder> (e.g. abeyjs init my-app).");
  }
  const rl = createInterface({ input, output });
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const ans = (await rl.question("Project name: ")).trim();
      if (ans.length > 0) {
        return ans;
      }
    }
  } finally {
    rl.close();
  }
}

/**
 * Whether the ecosystem **`componentRoute`** should appear in the admin sidebar (**`showInNav`**).
 * Non-TTY: defaults to **`true`** (pass **`--no-show-nav`** in scripts to hide).
 */
async function askEcosystemShowInNav(): Promise<boolean> {
  if (!input.isTTY || !output.isTTY) {
    // eslint-disable-next-line no-console
    console.log("Non-interactive: sidebar entry enabled (showInNav). Use --no-show-nav to hide from nav.");
    return true;
  }
  const rl = createInterface({ input, output });
  try {
    const ans = (
      await rl.question("¿Mostrar esta ruta en el menú lateral del admin (showInNav)? [Y/n] ")
    )
      .trim()
      .toLowerCase();
    if (ans === "" || ans === "y" || ans === "yes" || ans === "s" || ans === "si") {
      return true;
    }
    if (ans === "n" || ans === "no") {
      return false;
    }
    return true;
  } finally {
    rl.close();
  }
}

async function askGenerateEntities(candidates: string[]): Promise<string[] | null> {
  if (!input.isTTY || !output.isTTY) {
    return null;
  }
  const rl = createInterface({ input, output });
  try {
    // eslint-disable-next-line no-console
    console.log("CRUD entity candidates:");
    for (const name of candidates) {
      // eslint-disable-next-line no-console
      console.log(`- ${name}`);
    }
    const mode = (
      await rl.question("Generate all views now? [Y/n] ")
    )
      .trim()
      .toLowerCase();
    if (mode === "" || mode === "y" || mode === "yes" || mode === "s" || mode === "si") {
      return null;
    }
    const picked: string[] = [];
    for (const name of candidates) {
      const ans = (
        await rl.question(`Generate view for ${name}? [y/N] `)
      )
        .trim()
        .toLowerCase();
      if (ans === "y" || ans === "yes" || ans === "s" || ans === "si") {
        picked.push(name);
      }
    }
    return picked;
  } finally {
    rl.close();
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function run() {
  const p = parseArgs(process.argv);
  if (p.kind === "initSyntaxErr") {
    // eslint-disable-next-line no-console
    console.error(p.message);
    process.exit(1);
  }
  if (p.kind === "err") {
    const argv = process.argv.slice(2);
    if (
      (argv[0] === "generate" && argv[1] === "ecosystem") ||
      (argv[0] === "g" && argv[1] === "ecosystem")
    ) {
      // eslint-disable-next-line no-console
      console.error(
        "Usage: abeyjs generate ecosystem <Name> [--feature-root <path>] [--target <folder>] [--show-nav|--no-show-nav]\n" +
          "Example (cwd): abeyjs generate ecosystem Auth\n" +
          "Example (paths): abeyjs generate ecosystem Auth --feature-root src/auth --target .\n" +
          "Hide from sidebar: abeyjs generate ecosystem Reports --no-show-nav",
      );
      process.exit(1);
    }
    // eslint-disable-next-line no-console
    console.error(buildHelp());
    process.exit(1);
  }
  if (p.kind === "help") {
    // eslint-disable-next-line no-console
    console.log(buildHelp());
    return;
  }
  if (p.kind === "version") {
    if (p.mode === "short") {
      // eslint-disable-next-line no-console
      console.log(getCliVersion());
    } else {
      // eslint-disable-next-line no-console
      console.log(buildVersionReport());
    }
    return;
  }
  if (p.kind === "addOpenapi") {
    const targetDir = resolveFromInvocationDir(p.target);
    await addOpenapiToApp(targetDir, { proxyTarget: p.proxy, openApiPath: p.openApiPath });
    const envExample = join(targetDir, ".env.example");
    const env = join(targetDir, ".env");
    try {
      await cp(envExample, env, { force: false });
    } catch {
      // Skip if .env already exists.
    }
    await maybeRunPostScaffoldInstall(targetDir, p.skipInstall);
    // eslint-disable-next-line no-console
    console.log("OpenAPI/CRUD wiring applied. Next: tune `.env` / proxy if needed.");
    // eslint-disable-next-line no-console
    console.log(`Path: ${targetDir}`);
    return;
  }
  if (p.kind === "connect") {
    const targetDir = resolveFromInvocationDir(p.target);
    const r = await runConnect(targetDir, p.swaggerUrl, { insecure: p.insecure });
    const byType = {
      crud: r.contract.entities.filter((e) => e.type === "crud").map((e) => e.name),
      action: r.contract.entities.filter((e) => e.type === "action").map((e) => e.name),
      service: r.contract.entities.filter((e) => e.type === "service").map((e) => e.name),
    };
    // eslint-disable-next-line no-console
    console.log(`Connect OK. CRUD: ${byType.crud.join(", ") || "(none)"}`);
    // eslint-disable-next-line no-console
    console.log(`Actions: ${byType.action.join(", ") || "(none)"} · Services: ${byType.service.join(", ") || "(none)"}`);
    // eslint-disable-next-line no-console
    console.log(`Contract: ${r.contractPath}`);
    // eslint-disable-next-line no-console
    console.log(`Config: ${r.yamlPath}`);
    return;
  }
  if (p.kind === "generateEcosystem") {
    const targetDir = resolveFromInvocationDir(p.target);
    // npm scripts run with cwd at package root; INIT_CWD preserves where the user invoked it.
    const invocationDir = resolve(process.env.INIT_CWD?.trim() || process.cwd());
    const showInNav = p.showInNav ?? (await askEcosystemShowInNav());
    const r = await runGenerateEcosystem({
      projectRoot: targetDir,
      featureRoot: p.featureRoot,
      rawName: p.name,
      invocationDir,
      showInNav,
    });
    for (const line of buildEcosystemWireInstructions(targetDir, r)) {
      // eslint-disable-next-line no-console
      console.log(line);
    }
    return;
  }
  if (p.kind === "generateViews") {
    const targetDir = resolveFromInvocationDir(p.target);
    const candidates = await listCrudCandidates(targetDir);
    if (candidates.length === 0) {
      throw new Error("No CRUD entity candidates found. Run `abeyjs connect` first.");
    }
    const chosen = await askGenerateEntities(candidates);
    if (chosen && chosen.length === 0) {
      throw new Error("No entities selected for generation.");
    }
    const r =
      chosen === null
        ? await runGenerateViewsWithOptions(targetDir, { scaffold: p.scaffold })
        : await runGenerateViewsWithOptions(targetDir, { onlyEntities: chosen, scaffold: p.scaffold });
    // eslint-disable-next-line no-console
    console.log(`Views generated: ${r.generatedEntities.join(", ")}`);
    // eslint-disable-next-line no-console
    console.log(`Path: ${targetDir}`);
    return;
  }
  if (p.kind === "init") {
    const target = p.target && p.target.trim() !== "" ? p.target.trim() : await askProjectName();
    const dir = resolveFromInvocationDir(target);
    await mkdir(dir, { recursive: true });
    const packageRoot = fileURLToPath(new URL("..", import.meta.url));
    const templateFolder = p.template === "abeyjs" ? "empty" : p.template;
    const from = join(packageRoot, "templates", templateFolder);
    if (templateFolder === "admin" || templateFolder === "empty") {
      await cp(from, dir, { recursive: true, force: true });
      // Ensure unique workspace package name (avoid collisions like "abeyjs-starter").
      await patchPackageJsonName(dir, target);
      if (p.template === "admin" && p.shell === "appbar") {
        const mainPath = join(dir, "src", "main.ts");
        const before = await readFile(mainPath, "utf-8");
        if (before.includes("dashboardLayout: true")) {
          await writeFile(
            mainPath,
            before.replace("dashboardLayout: true", "dashboardLayout: false"),
            "utf-8",
          );
        }
      }
      const shellLine =
        p.template === "admin" && p.shell === "appbar"
          ? " [shell appbar: compact app bar + sidebar]"
          : p.template === "admin"
            ? " [shell dashboard: top bar + sidebar + main content]"
            : "";
      const readMeLine3 =
        p.template === "admin"
          ? "3. Routes: src/routes.ts · home: src/views/home/ (app.home.view.html / .ts / .css, @AbeyComponent + lazy load) · intents/runtime: src/omegaSetup.ts · HTTP: src/common/http.ts · session: src/common/session.ts (optional: --shell appbar)"
          : "3. Routes: src/routes.ts · home: src/views/home/ (app.home.view.html / .ts / .css) · intents/runtime: src/omegaSetup.ts · environments: src/environment.ts · assets: public/";
      await writeFile(
        join(dir, "README.txt"),
        [
          "Generated app (blank starter or admin shell).",
          `1. cd "${dir}"`,
          "2. npm run dev",
          readMeLine3,
          "4. Baseline: `src/flows/*` (helpers + intent/channel glue) + `src/services/http.ts` + `runtime.onIntent(...)` / `runtime.channel` in `src/omegaSetup.ts`.",
          "5. After `abeyjs connect`, run `abeyjs generate views` (default `--scaffold minimal`). Extra layers: `--scaffold full`.",
        ].join("\n"),
        "utf-8",
      );
      await maybeRunPostScaffoldInstall(dir, p.skipInstall);
      // eslint-disable-next-line no-console
      console.log(
        `Project created with template "${p.template}"` +
          (shellLine ? ` ${shellLine}` : ``) +
          ".",
      );
      // eslint-disable-next-line no-console
      console.log(`Path: ${dir}`);
      return;
    }
    const pkg = {
      name: toWorkspaceSafePackageName(target),
      private: true,
      type: "module",
      scripts: {
        codegen: "abeyjs codegen ./openapi.json -o ./src/generated",
      },
      dependencies: { "@abeyjs/core": "^0.1.1" },
    };
    await writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");
    await writeFile(
      join(dir, "README.txt"),
      [
        "1. abeyjs codegen ./openapi.json -o ./src/generated",
        "2. Implement src/omegaSetup.ts (register agents + intents).",
        "3. Wire @abeyjs/view and @abeyjs/http in your bundler (Vite, etc.) or run: abeyjs init otherFolder --template admin",
      ].join("\n"),
      "utf-8",
    );
    const miniOpenapi = {
      openapi: "3.0.3",
      info: { title: "Starter", version: "0.0.0" },
      paths: { "/": { get: { responses: { "200": { description: "ok" } } } } } ,
    };
    await writeFile(join(dir, "openapi.json"), JSON.stringify(miniOpenapi, null, 2), "utf-8");
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(
      join(dir, "src", "omegaSetup.example.ts"),
      `import { createOmegaRuntime } from "@abeyjs/runtime";

export function createOmega() {
  const runtime = createOmegaRuntime();
  // import { omegaSetupGenerated } from "./generated/omegaSetup.generated.js"
  // merge agents, intents, and HTTP integration here
  return { runtime };
}
`,
      "utf-8",
    );
    await maybeRunPostScaffoldInstall(dir, p.skipInstall);
    // eslint-disable-next-line no-console
    console.log("Created at: " + dir);
    return;
  }
  if (p.kind === "codegen") {
    const { openapi, out: outParam } = p;
    const outDir = resolveFromInvocationDir(outParam);
    const specPath = resolveFromInvocationDir(openapi);
    await mkdir(outDir, { recursive: true });
    const typesPath = join(outDir, "api-types.ts");
    const nodes = await openapiTS(pathToFileURL(specPath), opts);
    const out = COMMENT_HEADER + astToString(nodes, {});
    await writeFile(typesPath, out, "utf-8");

    let spec: Spec;
    let partialYaml = false;
    if (specPath.toLowerCase().endsWith(".json")) {
      spec = JSON.parse(await readFile(specPath, "utf-8")) as Spec;
    } else {
      const raw = await readFile(specPath, "utf-8");
      if (raw.trimStart().startsWith("{")) {
        try {
          spec = JSON.parse(raw) as Spec;
        } catch {
          spec = {};
          partialYaml = true;
        }
      } else {
        spec = {};
        partialYaml = true;
      }
    }

    const stubPath = join(outDir, "omegaSetup.generated.ts");
    await writeFile(stubPath, generateStub(spec, partialYaml), "utf-8");
    // eslint-disable-next-line no-console
    console.log("Wrote:\n  " + typesPath + "\n  " + stubPath);
  }
}

void run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
