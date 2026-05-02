/**
 * Ecosystem scaffolding for `abeyjs generate ecosystem`.
 *
 * Creates a **vertical slice** under `src/.../<kebab>/` with:
 * - `omega/` — `semantics.ts`, `behavior.ts`, `agent.ts`, `flow.ts`, `register.ts` (`install{Pascal}Omega`).
 * - `ui/` — `app-<kebab>.ts` (@AbeyComponent), `app-<kebab>.view.html`, `<kebab>.css` (`?raw` / `?url` imports).
 * - `model/`, `data/` — empty placeholders for DTOs and repositories.
 *
 * When `src/omegaSetup.ts` and `src/routes.ts` exist, best-effort patches add the installer import/call
 * and a `componentRoute` entry before the 404 handler.
 */

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { constants as fsConstants } from "node:fs";

/** Ensures the feature folder resolves inside `--target`, not escaping the project tree. */
function assertInsideProject(projectRoot: string, featureAbs: string): void {
  const base = resolve(projectRoot);
  const child = resolve(featureAbs);
  const rel = relative(base, child);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`feature-root must be inside project (--target): ${featureAbs}`);
  }
}

/** Ecosystem slices must live under `src/` (AbeyJs convention for app code). */
function assertInsideSrc(projectRoot: string, featureAbs: string): void {
  const srcAbs = resolve(projectRoot, "src");
  const child = resolve(featureAbs);
  const rel = relative(srcAbs, child);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`feature-root must be inside src/: ${featureAbs}`);
  }
}

/**
 * Normalizes CLI input into a PascalCase type name (`Auth Users` → `AuthUsers`, `billing` → `Billing`).
 * @throws If the cleaned string is empty.
 */
export function normalizeEcosystemPascal(raw: string): string {
  const cleaned = raw.replace(/[-_\s]+/g, " ").trim();
  if (!cleaned) {
    throw new Error("Empty ecosystem name (e.g. Auth).");
  }
  if (cleaned.includes(" ")) {
    return cleaned
      .split(/\s+/)
      .map((p) => (p.length ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""))
      .join("");
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Folder and route slug from PascalCase (`StudentRoster` → `student-roster`). */
export function pascalToKebab(pascal: string): string {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds the directory that contains `src/`. Honors explicit `--target` when it already has `src/`,
 * else walks upward from cwd / nested `src/**` paths (e.g. running from `src/ecosystems`).
 */
async function resolveAppRoot(maybeRoot: string): Promise<string> {
  // Prefer explicit app root (contains `src/`)
  let cur = resolve(maybeRoot);
  if (await pathExists(join(cur, "src"))) return cur;

  // If invoked from inside `src/**`, go up to the directory that contains `src/`.
  // Example: `<app>/src/ecosystems` -> `<app>`
  const parts = cur.split(/[/\\]+/g).filter(Boolean);
  const srcIx = parts.lastIndexOf("src");
  if (srcIx >= 0) {
    const app = parts.slice(0, srcIx).join("/");
    if (app) {
      const appAbs = resolve(app);
      if (await pathExists(join(appAbs, "src"))) return appAbs;
    }
  }

  // Fallback: walk up until we find `src/` or hit filesystem root.
  while (true) {
    const parent = resolve(cur, "..");
    if (parent === cur) break;
    cur = parent;
    if (await pathExists(join(cur, "src"))) return cur;
  }

  throw new Error(`Could not find src/ upward from: ${maybeRoot}. Point --target at the app root.`);
}

export interface GenerateEcosystemOptions {
  /**
   * Path passed as `--target` (usually `.`). Resolved to the app root that contains `src/` (same logic as internal `resolveAppRoot`).
   */
  projectRoot: string;
  /**
   * Override where the ecosystem folder is written. Relative to `projectRoot` unless absolute.
   * Default: `src/<kebab>` or `<relative-src-prefix>/<kebab>` when `invocationDir` is under `src/`.
   */
  featureRoot?: string;
  /**
   * Verbatim CLI name (`Auth`, `student roster`, etc.) before `normalizeEcosystemPascal`.
   */
  rawName: string;
  /**
   * `INIT_CWD` / cwd at command start; steers default `featureRoot` when developers run the CLI inside `src/...`
   * (e.g. `src/features` ⇒ default `src/features/<kebab>` instead of flat `src/<kebab>`).
   */
  invocationDir?: string;
}

/**
 * Returned after files are written; used for post-console instructions and tooling.
 */
export interface GenerateEcosystemResult {
  /** Normalized PascalCase ecosystem name (`Auth`). */
  pascal: string;
  /** URL-safe slug derived from {@link GenerateEcosystemResult.pascal} (e.g. `auth`). */
  kebab: string;
  /** Export from `omega/register.ts`: `install{pascal}Omega`. */
  installFn: string;
  /** Absolute path to the new ecosystem root (contains `omega/`, `ui/`, etc.). */
  featureAbs: string;
}

function semanticsTs(pascal: string, kebab: string): string {
  const prefix = kebab.replace(/-/g, "_");
  return `/**
 * Agent, flow, intent, and channel event names for the ${pascal} ecosystem.
 * Generated by \`abeyjs generate ecosystem\`.
 */
export const ${pascal}Ecosystem = {
  agentId: "ecosystem:${prefix}:agent",
  flowId: "ecosystem:${prefix}:flow",
  intentTick: "${pascal}/Tick",
  intentLoadTable: "${pascal}/TableLoad",
  intentTableSelection: "${pascal}/TableSelection",
  intentTableAction: "${pascal}/TableAction",
  eventTicked: "omega/ecosystem/${kebab}/ticked",
  eventTableColumns: "omega/ecosystem/${kebab}/tableColumns",
  eventTableActions: "omega/ecosystem/${kebab}/tableActions",
  eventTableItems: "omega/ecosystem/${kebab}/tableItems",
} as const;
`;
}

function behaviorTs(pascal: string): string {
  return `import { OmegaAgentBehaviorEngine, OmegaAgentBehaviorRule, OmegaAgentReaction } from "@abeyjs/agents";
import { ${pascal}Ecosystem } from "./semantics.js";

export class ${pascal}Behavior extends OmegaAgentBehaviorEngine {
  constructor() {
    super();
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === ${pascal}Ecosystem.intentTick,
        () => new OmegaAgentReaction("tick"),
      ),
    );
  }
}
`;
}

function agentTs(pascal: string): string {
  return `import { OmegaStatefulAgent, type OmegaAgentContext } from "@abeyjs/agents";
import type { OmegaAgentMessage } from "@abeyjs/agents";
import { ${pascal}Ecosystem } from "./semantics.js";

export interface ${pascal}ViewState {
  tickCount: number;
}

export class ${pascal}Agent extends OmegaStatefulAgent<${pascal}ViewState> {
  constructor(ctx: OmegaAgentContext) {
    super(ctx, { tickCount: 0 });
  }

  override connect(): void {
    /* Subscribe with this.on(...) when the agent must react to named channel events. */
  }

  protected override onAction(action: string, _payload?: unknown): void {
    if (action === "tick") {
      const next = { tickCount: this.viewState.get().tickCount + 1 };
      this.setViewState(next);
      this.emit(${pascal}Ecosystem.eventTicked, { tickCount: next.tickCount });
    }
  }

  protected override onMessage(_msg: OmegaAgentMessage): void {}
}
`;
}

function flowTs(pascal: string): string {
  return `import type { OmegaChannel } from "@abeyjs/core";
import type { OmegaFlowContext } from "@abeyjs/flows";
import { OmegaFlow } from "@abeyjs/flows";
import { ${pascal}Agent } from "./agent.js";
import { ${pascal}Ecosystem } from "./semantics.js";

export class ${pascal}Flow extends OmegaFlow {
  private readonly agent: ${pascal}Agent;

  constructor(channel: OmegaChannel, agent: ${pascal}Agent) {
    super(${pascal}Ecosystem.flowId, channel);
    this.agent = agent;
  }

  override onStart(): void {
    this.emitExpression("idle");
  }

  override onIntent(ctx: OmegaFlowContext): void {
    const intent = ctx.intent;
    if (intent?.name === ${pascal}Ecosystem.intentTick) {
      this.emitExpression("loading");
      this.agent.receiveIntent(intent);
    }
  }

  override onEvent(ctx: OmegaFlowContext): void {
    const ev = ctx.event;
    if (ev?.name === ${pascal}Ecosystem.eventTicked) {
      this.emitExpression("success", ev.payload);
    }
  }
}
`;
}

function registerTs(pascal: string, kebab: string): string {
  return `import { intentOf } from "@abeyjs/core";
import type { OmegaRuntime } from "@abeyjs/runtime";
import { ${pascal}Agent } from "./agent.js";
import { ${pascal}Behavior } from "./behavior.js";
import { ${pascal}Flow } from "./flow.js";
import { ${pascal}Ecosystem } from "./semantics.js";

/**
 * Registers the agent + flow and wires intents into \`handleIntent\` for running flows.
 * Call from \`createOmega()\` in \`src/omegaSetup.ts\`.
 */
export function install${pascal}Omega(runtime: OmegaRuntime): void {
  const agent = new ${pascal}Agent({
    channel: runtime.channel,
    selfId: ${pascal}Ecosystem.agentId,
    behavior: new ${pascal}Behavior(),
  });
  const flow = new ${pascal}Flow(runtime.channel, agent);

  runtime.registerAgent((ch) => {
    if (ch !== runtime.channel) {
      throw new Error("${kebab}: unexpected channel in registerAgent");
    }
    return agent;
  });
  runtime.flow.registerFlow(flow);
  // Keep flows running in parallel; don't pause others.
  runtime.flow.activate(flow.id);

  runtime.onIntent(${pascal}Ecosystem.intentTick, (payload) => {
    void runtime.flow.handleIntent(intentOf(${pascal}Ecosystem.intentTick, payload), { source: "${kebab}-ecosystem" });
  });

  runtime.onIntent(${pascal}Ecosystem.intentLoadTable, (payload) => {
    void runtime.flow.handleIntent(intentOf(${pascal}Ecosystem.intentLoadTable, payload), { source: "${kebab}-ecosystem" });
  });

  runtime.onIntent(${pascal}Ecosystem.intentTableSelection, (payload) => {
    void runtime.flow.handleIntent(intentOf(${pascal}Ecosystem.intentTableSelection, payload), { source: "${kebab}-ecosystem" });
  });

  runtime.onIntent(${pascal}Ecosystem.intentTableAction, (payload) => {
    void runtime.flow.handleIntent(intentOf(${pascal}Ecosystem.intentTableAction, payload), { source: "${kebab}-ecosystem" });
  });
}
`;
}

function uiHtml(pascal: string, kebab: string): string {
  return `<section class="abey-${kebab}" data-role="${kebab}-root">
  <header class="abey-${kebab}__header">
    <h1>${pascal}</h1>
    <p class="abey-${kebab}__hint">Scaffolded ecosystem (agent + flow + behavior). Try the button.</p>
  </header>
  <p class="abey-${kebab}__status" role="status">{{ banner }}</p>
  <button type="button" class="abey-${kebab}__btn" (click)="tick()">Tick</button>
</section>`;
}

function uiCss(kebab: string): string {
  return `.abey-${kebab} {
  padding: 1rem 1.25rem;
  max-width: none;
  width: 100%;
}
.abey-${kebab}__header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
}
.abey-${kebab}__hint {
  margin: 0;
  opacity: 0.85;
  font-size: 0.9rem;
}
.abey-${kebab}__status {
  margin: 1rem 0;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
}
.abey-${kebab}__btn {
  padding: 0.45rem 0.9rem;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in srgb, CanvasText 25%, transparent);
  background: color-mix(in srgb, Canvas 92%, CanvasText 4%);
  cursor: pointer;
}
.abey-${kebab}__btn:hover {
  background: color-mix(in srgb, Canvas 85%, CanvasText 8%);
}

.abey-${kebab}__table {
  margin-top: 1rem;
}
`;
}

function uiTs(pascal: string, kebab: string, importSemanticsRelative: string): string {
  const selector = `app-${kebab}`;
  const cssFile = `${kebab}.css`;
  const viewFile = `${selector}.view.html`;
  const cssVar = `${pascal}CssUrl`;
  return `import { intentOf } from "@abeyjs/core";
import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import template from "./${viewFile}?raw";
import ${cssVar} from "./${cssFile}?url";
import { ${pascal}Ecosystem } from "${importSemanticsRelative}";

@AbeyComponent({
  selector: "${selector}",
  template,
  stylesHrefs: [${cssVar}],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class App${pascal}Element extends AbeyComponentElement {
  constructor() {
    super();
    this.state = {
      banner: "—",
      tick: () => this.tick(),
    };
  }

  private tick(): void {
    const runtime = this.runtime;
    if (!runtime) return;
    void runtime.dispatch(intentOf(${pascal}Ecosystem.intentTick, { at: Date.now() }), { source: "${kebab}-ui" });
  }

  connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#wire();
    });
  }

  #wire(): void {
    const channel = (this as any).channel?.() as any;
    if (!channel?.on) return;
    this.onDestroy(
      channel.on(${pascal}Ecosystem.eventTicked, (data: any) => {
        (this.state.banner as any) = \`ticked: \${JSON.stringify(data)}\`;
      }),
    );
  }
}
`;
}

function ecosystemReadme(pascal: string, kebab: string): string {
  return `# Ecosystem: ${pascal}

This folder holds the vertical slice for **${pascal}**.

## Layout
- **model/** — Plain types/DTOs (no runtime, no side effects). Example: \`${pascal}Row\`, payloads.
- **data/** — Data access (HTTP/repos/mocks/cache). Keep DOM out of here.
- **omega/** — AbeyJs core for the slice:
  - \`semantics.ts\` — stable strings (intents/events/ids).
  - \`*-agent.ts\` / \`*-behavior.ts\` — agent + rules.
  - \`*-flow.ts\` — \`onIntent\` / \`onEvent\` orchestration → channel events + UI expressions.
  - \`register.ts\` — runtime install (intent wiring + flow activation).
- **ui/** — Templates, styles, components. Emits intents and listens for channel traffic.

## Flow convention
- UI → **intent** (\`${pascal}/TableLoad\`, etc.)
- Flow → **event** (\`omega/ecosystem/${kebab}/...\`)

`;
}

/**
 * Materializes the ecosystem tree and runs auto-wiring (`tryWireProjectFiles`) when both omega setup and routes exist.
 *
 * Flow:
 * 1. Resolve `opts.projectRoot` → app root.
 * 2. Derive Pascal + kebab names; compute default `featureRoot` from `invocationDir` vs `projectRoot/src`.
 * 3. Refuse overwrite if the computed feature directory already exists.
 * 4. Emit omega + UI sources (sample tick intent / agent / flow).
 *
 * Generated UI uses **`?raw`** for the `.view.html` string (classic Abey component), not the Vite OM compiler plugin.
 */
export async function runGenerateEcosystem(opts: GenerateEcosystemOptions): Promise<GenerateEcosystemResult> {
  const projectRoot = await resolveAppRoot(opts.projectRoot);
  const pascal = normalizeEcosystemPascal(opts.rawName);
  const kebab = pascalToKebab(pascal);
  // Default:
  // - If invoked from inside `src/**`, create under the invocation dir (so running from `src/ecosystems` yields `src/ecosystems/<kebab>`).
  // - Otherwise, create under `src/<kebab>`.
  let defaultFeatureRoot = join("src", kebab);
  if (opts.invocationDir) {
    const invokedAbs = resolve(opts.invocationDir);
    const srcAbs = resolve(projectRoot, "src");
    const relToSrc = relative(srcAbs, invokedAbs);
    if (!(relToSrc.startsWith("..") || isAbsolute(relToSrc))) {
      // invocation is inside src/
      const relToProject = relative(projectRoot, invokedAbs);
      if (!(relToProject.startsWith("..") || isAbsolute(relToProject))) {
        defaultFeatureRoot = join(relToProject, kebab);
      }
    }
  }
  const rawFeatureRoot = (opts.featureRoot ?? defaultFeatureRoot).trim();
  const featureAbs = isAbsolute(rawFeatureRoot) ? resolve(rawFeatureRoot) : resolve(projectRoot, rawFeatureRoot);
  assertInsideProject(projectRoot, featureAbs);
  assertInsideSrc(projectRoot, featureAbs);
  const uiDir = join(featureAbs, "ui");
  const omegaDir = join(featureAbs, "omega");
  const modelDir = join(featureAbs, "model");
  const dataDir = join(featureAbs, "data");

  if (await pathExists(featureAbs)) {
    throw new Error(`Ecosystem already exists: ${featureAbs} (delete the folder or pick another --feature-root).`);
  }

  await mkdir(uiDir, { recursive: true });
  await mkdir(omegaDir, { recursive: true });
  await mkdir(modelDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });

  const semanticsImport = `../omega/semantics.js`;

  await writeFile(join(featureAbs, "README.md"), ecosystemReadme(pascal, kebab), "utf-8");
  await writeFile(join(omegaDir, `semantics.ts`), semanticsTs(pascal, kebab), "utf-8");
  await writeFile(join(omegaDir, `behavior.ts`), behaviorTs(pascal), "utf-8");
  await writeFile(join(omegaDir, `agent.ts`), agentTs(pascal), "utf-8");
  await writeFile(join(omegaDir, `flow.ts`), flowTs(pascal), "utf-8");
  await writeFile(join(omegaDir, `register.ts`), registerTs(pascal, kebab), "utf-8");

  await writeFile(join(uiDir, `app-${kebab}.view.html`), uiHtml(pascal, kebab), "utf-8");
  await writeFile(join(uiDir, `${kebab}.css`), uiCss(kebab), "utf-8");
  await writeFile(join(uiDir, `app-${kebab}.ts`), uiTs(pascal, kebab, semanticsImport), "utf-8");

  const result: GenerateEcosystemResult = {
    pascal,
    kebab,
    installFn: `install${pascal}Omega`,
    featureAbs,
  };

  await tryWireProjectFiles(projectRoot, result);

  return result;
}

/**
 * No-op unless both omega setup and routing files resolve. Tries `src/omegaSetup.ts` + `src/routes.ts`, then
 * `omegaSetup.ts` + `routes.ts` at the project root.
 */
async function tryWireProjectFiles(projectRoot: string, result: GenerateEcosystemResult): Promise<void> {
  // Supports two layouts:
  // - target = app root → `src/omegaSetup.ts` + `src/routes.ts`
  // - target = `src/`   → `omegaSetup.ts` + `routes.ts`
  const omegaSetupCandidates = [join(projectRoot, "src", "omegaSetup.ts"), join(projectRoot, "omegaSetup.ts")];
  const routesCandidates = [join(projectRoot, "src", "routes.ts"), join(projectRoot, "routes.ts")];

  const omegaSetupPath = (await pathExists(omegaSetupCandidates[0]!))
    ? omegaSetupCandidates[0]!
    : (await pathExists(omegaSetupCandidates[1]!))
      ? omegaSetupCandidates[1]!
      : null;
  const routesPath = (await pathExists(routesCandidates[0]!))
    ? routesCandidates[0]!
    : (await pathExists(routesCandidates[1]!))
      ? routesCandidates[1]!
      : null;

  if (!omegaSetupPath || !routesPath) {
    return;
  }

  await wireOmegaSetup(omegaSetupPath, result);
  await wireRoutes(routesPath, result);
}

/**
 * Idempotent-ish: skips if `{@link GenerateEcosystemResult.installFn}(runtime)` is already present.
 * Inserts `import … register` after the contiguous import block, then `{@link GenerateEcosystemResult.installFn}(runtime)`
 * after `registerModule(registerCommon)` → else after `createOmegaRuntime()` → else before `return { runtime }`.
 */
async function wireOmegaSetup(omegaSetupPath: string, result: GenerateEcosystemResult): Promise<void> {
  const before = await readFile(omegaSetupPath, "utf-8");
  const registerTsPath = join(result.featureAbs, "omega", `register.ts`);
  const importRegister = tsImportPath(omegaSetupPath, registerTsPath);
  const importLine = `import { ${result.installFn} } from "${importRegister}";`;
  const callLine = `${result.installFn}(runtime);`;

  if (before.includes(callLine)) {
    return;
  }

  // 1) Import: insert after last import line.
  let out = before;
  if (!out.includes(importLine)) {
    const m = out.match(/^(import .*;\r?\n)+/m);
    if (m && m.index === 0) {
      out = out.slice(0, m[0].length) + importLine + "\n" + out.slice(m[0].length);
    } else {
      out = importLine + "\n" + out;
    }
  }

  // 2) Call: insert after `runtime.registerModule(registerCommon);` when present (DI must be ready),
  // otherwise after `const runtime = createOmegaRuntime();`.
  const registerCommonRe = /runtime\.registerModule\(\s*registerCommon\s*\)\s*;\r?\n/;
  if (registerCommonRe.test(out)) {
    out = out.replace(registerCommonRe, (s) => s + "  " + callLine + "\n");
  } else {
    const runtimeLineRe = /const\s+runtime\s*=\s*createOmegaRuntime\(\)\s*;\r?\n/;
    if (runtimeLineRe.test(out)) {
      out = out.replace(runtimeLineRe, (s) => s + "  " + callLine + "\n");
    } else {
      // fallback: insert before return
      out = out.replace(/return\s+\{\s*runtime\s*\}\s*;\r?\n/, (s) => "  " + callLine + "\n" + s);
    }
  }

  if (out !== before) {
    await writeFile(omegaSetupPath, out, "utf-8");
  }
}

/**
 * Adds `componentRoute('/<kebab>', …, { selector: 'app-<kebab>', load: () => import('…/ui/app-<kebab>.js') })` before the
 * first `pageRoute(` (404 catch-all). Ensures `componentRoute` is imported from `@abeyjs/view`. Skips if `/kebab` already exists.
 */
async function wireRoutes(routesPath: string, result: GenerateEcosystemResult): Promise<void> {
  const before = await readFile(routesPath, "utf-8");
  const uiTsPath = join(result.featureAbs, "ui", `app-${result.kebab}.ts`);
  const importMount = tsImportPath(routesPath, uiTsPath);
  const selector = `app-${result.kebab}`;
  const routeSnippet =
    `    componentRoute(\n` +
    `      "/${result.kebab}",\n` +
    `      { label: "${result.pascal}", title: "${result.pascal}", navIconFa: "fa-solid fa-cube" },\n` +
    `      { selector: "${selector}", load: () => import("${importMount}") },\n` +
    `    ),\n`;

  if (before.includes(`path: "/${result.kebab}"`)) {
    return;
  }

  let out = before;
  // Ensure componentRoute import exists.
  if (!out.includes("componentRoute")) {
    const merged = out.replace(
      /import\s+\{\s*pageRoute\s*\}\s+from\s+"@abeyjs\/view";\r?\n/,
      `import { componentRoute, pageRoute } from "@abeyjs/view";\n`,
    );
    if (merged !== out) {
      out = merged;
    } else {
      out = `import { componentRoute } from "@abeyjs/view";\n` + out;
    }
  }
  if (out.includes("componentRoute") && !/^import\s+\{\s*[^}]*componentRoute/m.test(out)) {
    const merged = out.replace(
      /import\s+\{\s*pageRoute\s*\}\s+from\s+"@abeyjs\/view";\r?\n/,
      `import { componentRoute, pageRoute } from "@abeyjs/view";\n`,
    );
    if (merged !== out) {
      out = merged;
    } else {
      out = `import { componentRoute } from "@abeyjs/view";\n` + out;
    }
  }

  // Insert before the 404 pageRoute("*", ...).
  const ix = out.indexOf("pageRoute(");
  if (ix >= 0) {
    out = out.slice(0, ix) + routeSnippet + out.slice(ix);
  } else {
    // fallback: append near end of routes array (best-effort)
    out = out.replace(/\]\s*;\r?\n\}\r?\n?$/, (m) => routeSnippet + m);
  }

  if (out !== before) {
    // Keep formatting: ensure 2-space indentation before `pageRoute(...)`.
    out = out.replace(/\npageRoute\(/g, "\n    pageRoute(");
    await writeFile(routesPath, out, "utf-8");
  }
}

/** Relative ESM specifier from one `.ts` file to another (`../../foo/bar.js`). */
function tsImportPath(fromFile: string, toFile: string): string {
  let rel = relative(dirname(fromFile), toFile).replace(/\\/g, "/");
  if (!rel.startsWith(".")) {
    rel = `./${rel}`;
  }
  return rel.replace(/\.ts$/, ".js");
}

/**
 * Human-readable recap printed after scaffolding when auto-wiring may have failed or layouts differ.
 * Matches the scaffold: `omega/register.ts` exposes `{@link GenerateEcosystemResult.installFn}`.
 */
export function buildEcosystemWireInstructions(_projectRoot: string, result: GenerateEcosystemResult): string[] {
  return [
    "Dependencies (install if missing):",
    "  npm i @abeyjs/runtime @abeyjs/agents @abeyjs/flows @abeyjs/core @abeyjs/view",
    "",
    "Manual wiring checklist (if not auto-patched):",
    `  - omega/register.ts exports ${result.installFn} → import + call inside createOmega()/omegaSetup.`,
    `  - routes.ts: add componentRoute for /${result.kebab} → lazy-load ui/app-${result.kebab}.ts (see generated snippet pattern).`,
    "",
    `Generated tree: ${result.featureAbs}`,
  ];
}
