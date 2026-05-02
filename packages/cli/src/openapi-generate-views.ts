/**
 * **`abeyjs generate views`**: reads **`.abeyjs/connect.json`** (**`ConnectContract`**) and **`abeyjs.connect.yml`**, merges YAML UI hints,
 * and emits list/form routes, OM templates, services, and optional **full** scaffold trees.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ConnectContract, EntityContract } from "./openapi-contract.js";
import {
  type ConnectYamlConfig,
  type EntityUiConfig,
  readConnectContract,
  readYamlConfig,
  resolveEntityConfig,
  validateYamlConfig,
  type FieldUiConfig,
} from "./openapi-config.js";

const START = "// ABEYJS-CONNECT-ROUTES-START";
const END = "// ABEYJS-CONNECT-ROUTES-END";
type LoginViewSpec = {
  entityName: string;
  fileBase: string;
  route: string;
  menuLabel: string;
  endpointPath: string;
  usernameField: string;
  passwordField: string;
  usernameRequired: boolean;
  passwordRequired: boolean;
};

export type ScaffoldMode = "minimal" | "full";

async function writeIfMissing(filePath: string, contents: string): Promise<void> {
  const existing = await readFile(filePath, "utf-8").catch(() => "");
  if (existing.trim() !== "") {
    return;
  }
  await writeFile(filePath, contents, "utf-8");
}

async function ensureAppScaffold(targetDir: string, scaffold: ScaffoldMode): Promise<void> {
  const root = resolve(targetDir);
  if (scaffold === "minimal") {
    const dirs = [join(root, "src", "flows"), join(root, "src", "services"), join(root, "src", "views")];
    for (const d of dirs) {
      await mkdir(d, { recursive: true });
    }

    await writeIfMissing(
      join(root, "src", "flows", "math.ts"),
      `export function sum(a: number, b: number): number {
  return a + b;
}
`,
    );

    await writeIfMissing(
      join(root, "src", "flows", "uploads.ts"),
      `export function validateUpload(file: File): { ok: true } | { ok: false; message: string } {
  if (!file || file.size === 0) {
    return { ok: false, message: "Pick a file first." };
  }
  return { ok: true };
}

export function buildBooksUploadFormData(file: File): FormData {
  const fd = new FormData();
  fd.append("file", file);
  return fd;
}
`,
    );

    await writeIfMissing(join(root, "src", "services", "session.ts"), buildSessionTs());
    await writeIfMissing(join(root, "src", "services", "http.ts"), buildServicesHttpTs(null));

    await writeIfMissing(
      join(root, "src", "flows", "README.txt"),
      [
        "AbeyJs — `flows/` folder (intents + channel events)",
        "",
        "- Each intent is an action: `runtime.onIntent(\"Book/Import\", ...)` and the UI fires via `runtime.dispatch(intentOf(...))`.",
        "- Chain steps: `runtime.channel.publish(\"Book/ExcelReady\", payload)` plus `runtime.channel.on(...)` to react and queue the next intent.",
        "- Pure helpers (file validation, math, etc.) live here or in small modules imported by flows.",
        "- HTTP: `src/services/http.ts` (`createAppHttp`, `postJson`, `postFormData`). Primary wiring stays in `src/omegaSetup.ts`.",
        "",
      ].join("\n"),
    );
    return;
  }

  // full scaffold (optional): keep the richer structure for teams that want it
  const dirs = [
    join(root, "src", "app"),
    join(root, "src", "flows"),
    join(root, "src", "services"),
    join(root, "src", "ui", "views"),
    join(root, "src", "ui", "views", "home"),
    join(root, "src", "domain", "resources"),
    join(root, "src", "application", "use-cases"),
    join(root, "src", "infra", "api"),
    join(root, "src", "infra", "generated", "openapi"),
    join(root, "src", "api"),
    join(root, "src", "generated", "api"),
    join(root, "src", "domain", "actions"),
    join(root, "src", "views"),
  ];
  for (const d of dirs) {
    await mkdir(d, { recursive: true });
  }

  await writeIfMissing(join(root, "src", "domain", "resources", "index.ts"), `export {};\n`);
  await writeIfMissing(join(root, "src", "application", "use-cases", "index.ts"), `export {};\n`);

  await writeIfMissing(join(root, "src", "services", "session.ts"), buildSessionTs());
  await writeIfMissing(join(root, "src", "services", "http.ts"), buildServicesHttpTs(null));

  await writeIfMissing(
    join(root, "src", "flows", "math.ts"),
    `export function sum(a: number, b: number): number {
  return a + b;
}
`,
  );

  await writeIfMissing(
    join(root, "src", "flows", "uploads.ts"),
    `export function validateUpload(file: File): { ok: true } | { ok: false; message: string } {
  if (!file || file.size === 0) {
    return { ok: false, message: "Pick a file first." };
  }
  return { ok: true };
}

export function buildBooksUploadFormData(file: File): FormData {
  const fd = new FormData();
  fd.append("file", file);
  return fd;
}
`,
  );

  await writeIfMissing(
    join(root, "src", "infra", "api", "client.ts"),
    `import { createOmegaHttp } from "@abeyjs/http";
import type { OmegaRuntime } from "@abeyjs/core";

const env = import.meta.env as { VITE_API_URL?: string };

export function createApiClient(runtime: OmegaRuntime, options?: { source?: string }) {
  return createOmegaHttp({
    channel: runtime.channel,
    baseUrl: (env.VITE_API_URL ?? "").trim(),
    source: options?.source ?? "app-api",
  });
}
`,
  );

  await writeIfMissing(join(root, "src", "infra", "api", "operations.ts"), `export {};\n`);
  await writeIfMissing(
    join(root, "src", "infra", "api", "index.ts"),
    `export * from "./client.js";
export * from "./operations.js";
`,
  );

  await writeIfMissing(join(root, "src", "infra", "generated", "openapi", "index.ts"), `export {};\n`);

  await writeIfMissing(join(root, "src", "api", "index.ts"), `export * from "../infra/api/index.js";\n`);

  await writeIfMissing(
    join(root, "src", "app", "routes.ts"),
    `import type { AppRoute } from "@abeyjs/view";
import { pageRoute, lazyViewMount } from "@abeyjs/view";
import { mountHome } from "../ui/views/home/home.js";

export function getRoutes(): AppRoute[] {
  return [
    {
      path: "/",
      label: "Inicio",
      title: "Inicio",
      navIconFa: "fa-solid fa-house",
      mount: mountHome,
    },
    ${START}
    ${END}
    pageRoute(
      "*",
      { label: "", title: "No encontrada", showInNav: false },
      { heading: "404", lead: "That route does not exist. Use the side navigation." },
    ),
  ];
}
`,
  );
  await writeIfMissing(
    join(root, "src", "ui", "views", "home", "home.ts"),
    `export function mountHome(outlet: HTMLElement): void {
  outlet.innerHTML = \`<section style="display:grid;gap:.5rem"><h1>Home</h1><p>App creada con AbeyJs.</p></section>\`;
}
`,
  );
}

function buildGeneratedApiCatalogTs(contract: ConnectContract, opts: { omegaCrudImport: string }): string {
  const opLines: string[] = [];
  for (const e of contract.entities) {
    const endpoints = e.endpoints ?? {};
    for (const [k, v] of Object.entries(endpoints)) {
      if (!v || typeof v !== "string") {
        continue;
      }
      const parts = v.split(/\s+/);
      if (parts.length < 2) {
        continue;
      }
      const method = parts[0]!.toUpperCase();
      const path = parts.slice(1).join(" ").trim();
      if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method)) {
        continue;
      }
      if (!path.startsWith("/")) {
        continue;
      }
      const key = `${e.name}_${k}`.replace(/[^a-zA-Z0-9_]/g, "_");
      const responseKind = /template|download|file|excel|pdf|octet|blob/i.test(path) ? "blob" : "json";
      opLines.push(
        `  ${JSON.stringify(key)}: { key: ${JSON.stringify(key)}, method: ${JSON.stringify(method)}, path: ${JSON.stringify(path)}, responseKind: ${JSON.stringify(responseKind)} },`,
      );
    }
  }
  const ops = opLines.length ? opLines.join("\n") : "  // (no operations detected)\n";
  return `// AUTO-GENERATED by \`abeyjs generate views\`
import type { OmegaRuntime } from "@abeyjs/core";
import { createAppHttp } from ${JSON.stringify(opts.omegaCrudImport)};

export type ResponseKind = "json" | "blob" | "text";
export type OperationDef = {
  key: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  responseKind: ResponseKind;
};

export const operations = {
${ops}
} as const satisfies Record<string, OperationDef>;

export type OperationKey = keyof typeof operations;

function buildUrl(pathTemplate: string, params?: Record<string, string | number>): string {
  let p = pathTemplate;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      p = p.replaceAll(\`{\${k}}\`, encodeURIComponent(String(v)));
    }
  }
  const base = (import.meta.env.VITE_API_URL ?? "").trim();
  return /^https?:\\/\\//i.test(p) ? p : \`\${base}\${p}\`;
}

function withQuery(url: string, query?: Record<string, string | number>): string {
  if (!query) {
    return url;
  }
  const s = new URLSearchParams(Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]))).toString();
  return s ? \`\${url}?\${s}\` : url;
}

export function createCatalog(runtime: OmegaRuntime) {
  const http = createAppHttp(runtime, { source: "api.catalog", withAuth: true });
  return {
    callJson: async <T = unknown>(
      key: OperationKey,
      input?: { params?: Record<string, string | number>; query?: Record<string, string | number>; body?: unknown },
    ): Promise<T> => {
      const op = operations[key];
      const url = withQuery(buildUrl(op.path, input?.params), input?.query);
      const init: RequestInit = {};
      if (op.method !== "GET" && op.method !== "DELETE") {
        init.headers = { "content-type": "application/json" };
        init.body = JSON.stringify(input?.body ?? {});
      }
      const r = await http.request(op.method, url, init);
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(\`\${op.method} \${op.path} -> \${r.status} \${t.slice(0, 200)}\`);
      }
      const txt = await r.text();
      if (txt.trim() === "") {
        return null as T;
      }
      return JSON.parse(txt) as T;
    },
    callBlob: async (
      key: OperationKey,
      input?: { params?: Record<string, string | number>; query?: Record<string, string | number>; body?: unknown },
    ): Promise<Blob> => {
      const op = operations[key];
      const url = withQuery(buildUrl(op.path, input?.params), input?.query);
      const init: RequestInit = {};
      if (op.method !== "GET" && op.method !== "DELETE") {
        init.body = input?.body instanceof FormData ? input.body : JSON.stringify(input?.body ?? {});
        if (!(input?.body instanceof FormData)) {
          init.headers = { "content-type": "application/json" };
        }
      }
      const r = await http.request(op.method, url, init);
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(\`\${op.method} \${op.path} -> \${r.status} \${t.slice(0, 200)}\`);
      }
      return await r.blob();
    },
  };
}
`;
}

function buildApiOperationsTs(opts: { catalogImport: string }): string {
  return `// AUTO-GENERATED by \`abeyjs generate views\`
import type { OmegaRuntime } from "@abeyjs/core";
import { createCatalog, type OperationKey } from ${JSON.stringify(opts.catalogImport)};

export type { OperationKey };

export function api(runtime: OmegaRuntime) {
  return createCatalog(runtime);
}
`;
}

function buildResourceFileTs(entity: EntityContract, entityCfg: EntityUiConfig): string {
  const fieldsCfg = entityCfg.fields ?? {};
  const names = Object.keys(entity.model);
  const lines: string[] = [];
  for (const name of names) {
    const meta = entity.model[name]!;
    const cfg = fieldsCfg[name];
    const widget = sanitizeWidget(cfg?.widget) ?? toFieldKind(name, cfg?.dataType ?? meta.type, cfg?.widget, meta.format);
    const options =
      cfg?.widget === "select" && cfg.options
        ? `, options: { endpoint: ${JSON.stringify(cfg.options.endpoint)}, valueField: ${JSON.stringify(cfg.options.valueField)}, labelField: ${JSON.stringify(cfg.options.labelField)} }`
        : "";
    lines.push(
      `    ${JSON.stringify(name)}: { dataType: ${JSON.stringify(cfg?.dataType ?? meta.type)}, format: ${meta.format ? JSON.stringify(meta.format) : "undefined"}, required: ${JSON.stringify(meta.required)}, widget: ${JSON.stringify(widget)}, label: ${JSON.stringify(cfg?.label ?? name)}, source: ${JSON.stringify(cfg?.source ?? name)}${options} },`,
    );
  }
  return `// AUTO-GENERATED by \`abeyjs generate views\` (editable)
export const ${entity.name}Resource = {
  name: ${JSON.stringify(entity.name)},
  fields: {
${lines.join("\n")}
  },
} as const;
`;
}

function kebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function routeForEntity(entity: EntityContract, yamlRoute?: string): string {
  if (yamlRoute && yamlRoute.trim() !== "") {
    return yamlRoute.trim().startsWith("/") ? yamlRoute.trim() : `/${yamlRoute.trim()}`;
  }
  return `/crud/${kebab(entity.name)}`;
}

function sanitizeWidget(widget: FieldUiConfig["widget"]): "text" | "number" | "email" | "date" | "select" | "readonly" {
  if (widget === "number") {
    return "number";
  }
  if (widget === "email") {
    return "email";
  }
  if (widget === "date") {
    return "date";
  }
  if (widget === "readonly") {
    return "readonly";
  }
  if (widget === "select") {
    return "select";
  }
  return "text";
}

function toFieldKind(
  fieldName: string,
  dataType: FieldUiConfig["dataType"],
  widget: FieldUiConfig["widget"],
  format?: string,
): "text" | "number" | "email" | "date" | "select" | "readonly" {
  if (widget) {
    return sanitizeWidget(widget);
  }
  if (/^(id|uuid|guid|_id)$/i.test(fieldName)) {
    return "readonly";
  }
  if (format === "date" || format === "date-time") {
    return "date";
  }
  if (dataType === "number" || dataType === "integer") {
    return "number";
  }
  return "text";
}

function detectRefreshTokenEndpoint(contract: ConnectContract, cfg: ConnectYamlConfig): string | null {
  const configured = cfg.app?.refreshTokenEndpoint?.trim();
  if (configured) {
    return configured;
  }
  for (const entity of contract.entities) {
    const entityCfg = resolveEntityConfig(entity, cfg);
    const effectiveType = entityCfg.type ?? entity.type;
    if (effectiveType === "service") {
      continue;
    }
    const endpointPath = entityCfg.endpointPath?.trim() || entity.routeBase;
    const txt = `${entity.name} ${endpointPath}`.toLowerCase();
    if (/refresh/.test(txt) && /(token|auth|session)/.test(txt)) {
      return endpointPath;
    }
  }
  return null;
}

function buildSessionTs(): string {
  return `const AUTH_TOKEN_KEY = "abeyjs.auth.token";
const AUTH_REFRESH_TOKEN_KEY = "abeyjs.auth.refreshToken";

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY)?.trim() ?? "";
}

export function setAuthToken(token: string): void {
  const t = token.trim();
  if (t) {
    localStorage.setItem(AUTH_TOKEN_KEY, t);
  }
}

export function getRefreshToken(): string {
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)?.trim() ?? "";
}

export function setRefreshToken(token: string): void {
  const t = token.trim();
  if (t) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, t);
  }
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
}

export function extractAuthTokens(payload: unknown): { accessToken: string | null; refreshToken: string | null } {
  if (!payload || typeof payload !== "object") {
    return { accessToken: null, refreshToken: null };
  }
  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const pick = (candidates: unknown[]): string | null => {
    for (const c of candidates) {
      if (typeof c === "string" && c.trim() !== "") {
        return c.trim();
      }
    }
    return null;
  };
  const accessToken = pick([data.accessToken, data.token, data.jwt, root.accessToken, root.token, root.jwt]);
  const refreshToken = pick([data.refreshToken, data.refresh, root.refreshToken, root.refresh]);
  return { accessToken, refreshToken };
}

export function hasSession(): boolean {
  return getAuthToken().length > 0;
}

export function redirectToLogin(): void {
  if (window.location.pathname === "/" || window.location.pathname === "/login") {
    return;
  }
  window.location.assign("/login");
}

export function ensureAuthenticated(): boolean {
  if (hasSession()) {
    return true;
  }
  redirectToLogin();
  return false;
}
`;
}

function buildServicesHttpTs(refreshTokenEndpoint: string | null): string {
  return `import { createOmegaHttp, type OmegaHttp } from "@abeyjs/http";
import type { OmegaRuntime } from "@abeyjs/core";
import {
  clearSession,
  extractAuthTokens,
  getAuthToken,
  getRefreshToken,
  redirectToLogin,
  setAuthToken,
  setRefreshToken,
} from "./session.js";

const env = import.meta.env as { VITE_OPENAPI_URL?: string; VITE_API_URL?: string };
const REFRESH_TOKEN_ENDPOINT = ${JSON.stringify(refreshTokenEndpoint)};

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshToken(runtime: OmegaRuntime): Promise<boolean> {
  if (!REFRESH_TOKEN_ENDPOINT) {
    return false;
  }
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  const refreshHttp = createOmegaHttp({
    channel: runtime.channel,
    baseUrl: (env.VITE_API_URL ?? "").trim(),
    source: "abeyjs-refresh",
  });
  try {
    const body = await refreshHttp.postJson<unknown>(REFRESH_TOKEN_ENDPOINT, { refreshToken });
    const tokens = extractAuthTokens(body);
    if (!tokens.accessToken) {
      return false;
    }
    setAuthToken(tokens.accessToken);
    if (tokens.refreshToken) {
      setRefreshToken(tokens.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

async function ensureRefreshOnce(runtime: OmegaRuntime): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = tryRefreshToken(runtime).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function buildAuthFetch(runtime: OmegaRuntime): typeof fetch {
  return async (input, init = {}) => {
    const withAuthHeaders = (sourceInit: RequestInit): RequestInit => {
      const headers = new Headers(sourceInit.headers ?? {});
      const token = getAuthToken();
      if (token) {
        headers.set("Authorization", \`Bearer \${token}\`);
      }
      return { ...sourceInit, headers };
    };
    let response = await fetch(input, withAuthHeaders(init));
    if (response.status !== 401) {
      return response;
    }
    const refreshed = await ensureRefreshOnce(runtime);
    if (!refreshed) {
      clearSession();
      redirectToLogin();
      return response;
    }
    response = await fetch(input, withAuthHeaders(init));
    if (response.status === 401) {
      clearSession();
      redirectToLogin();
    }
    return response;
  };
}

export function createAppHttp(
  runtime: OmegaRuntime,
  options?: { source?: string; withAuth?: boolean },
): OmegaHttp {
  const withAuth = options?.withAuth !== false;
  return createOmegaHttp({
    channel: runtime.channel,
    baseUrl: (env.VITE_API_URL ?? "").trim(),
    source: options?.source ?? "abeyjs-connect",
    requestInterceptors: [],
    fetch: withAuth ? buildAuthFetch(runtime) : fetch,
    cache: {
      enabled: true,
      ttlMs: 30_000,
      lookupTtlMs: 5 * 60_000,
      lookupPaths: ["/api/lookups", "/api/catalog", "/api/catalogs", "/api/lookup"],
    },
  });
}

export function postJson<T>(http: OmegaHttp, path: string, body: unknown): Promise<T> {
  return http.postJson<T>(path, body);
}

export function postFormData(http: OmegaHttp, path: string, formData: FormData): Promise<Response> {
  return http.request("POST", path, { body: formData });
}
`;
}

function buildOmegaCrudConnectTs(_refreshTokenEndpoint: string | null, scaffold: ScaffoldMode): string {
  const rel = scaffold === "full" ? "../services" : "./services";
  return `// AUTO-GENERATED by \`abeyjs generate views\`
import { createOmegaRuntime, type OmegaRuntime } from "@abeyjs/core";
import { createOmegaHttp } from "@abeyjs/http";
import { registerOpenApiAllCrud, type OpenApiRegisterOk } from "@abeyjs/openapi";
import { createAppHttp } from "${rel}/http.js";
import { ensureAuthenticated } from "${rel}/session.js";

export * from "${rel}/session.js";
export { createAppHttp, postFormData, postJson } from "${rel}/http.js";

const env = import.meta.env as { VITE_OPENAPI_URL?: string; VITE_API_URL?: string };

export type ConnectedCrudBundle = {
  runtime: OmegaRuntime;
  items: OpenApiRegisterOk[];
};

let cached: ConnectedCrudBundle | undefined;

export function withAuthGuard(
  mount: (outlet: HTMLElement) => void | (() => void),
): (outlet: HTMLElement) => void | (() => void) {
  return (outlet: HTMLElement) => {
    if (!ensureAuthenticated()) {
      outlet.textContent = "Redirigiendo a login...";
      return;
    }
    return mount(outlet);
  };
}

export async function initConnectedCrud(): Promise<ConnectedCrudBundle> {
  if (cached) {
    return cached;
  }
  const openApiUrl = (env.VITE_OPENAPI_URL ?? "").trim();
  if (openApiUrl === "") {
    throw new Error("Falta VITE_OPENAPI_URL. Configura .env para el entorno actual.");
  }
  const runtime = createOmegaRuntime();
  const openApiHttp = createOmegaHttp({
    channel: runtime.channel,
    baseUrl: "",
    source: "abeyjs-openapi",
  });
  const spec = await openApiHttp.getJson<Record<string, unknown>>(openApiUrl);
  const http = createAppHttp(runtime, { source: "abeyjs-connect", withAuth: true });
  const reg = registerOpenApiAllCrud({ spec, runtime, http, useMemoryOnApiFailure: true });
  if (!reg.ok) {
    throw new Error(reg.error);
  }
  cached = { runtime, items: reg.items };
  return cached;
}
`;
}

function buildEntityHtml(entity: EntityContract, menuLabel: string): string {
  return `<section class="abey-generated-crud">
  <header class="abey-generated-crud__header">
    <h1>${menuLabel}</h1>
    <p>Auto-generated CRUD view for ${entity.name}.</p>
  </header>
  <div data-role="crud-host"></div>
</section>
`;
}

function buildEntityCss(): string {
  return `.abey-generated-crud {
  display: grid;
  gap: 0.75rem;
}

.abey-generated-crud__header h1 {
  margin: 0;
}

.abey-generated-crud__header p {
  margin: 0;
  color: var(--abey-text-muted, #5b6472);
}
`;
}

function buildLoginHtml(spec: LoginViewSpec): string {
  const userReq = spec.usernameRequired ? " required" : "";
  const passReq = spec.passwordRequired ? " required" : "";
  const userMark = spec.usernameRequired ? " *" : "";
  const passMark = spec.passwordRequired ? " *" : "";
  return `<section class="abey-login-view">
  <div class="abey-login-view__brand">AbeyJs</div>
  <header class="abey-login-view__header">
    <h1>Welcome Back!</h1>
    <p>We missed you! Please enter your details.</p>
  </header>
  <form class="abey-login-view__form" data-role="login-form">
    <label class="abey-login-view__field">
      <span>Email${userMark}</span>
      <input name="username" type="text" autocomplete="username" placeholder="Enter your Email"${userReq} />
    </label>
    <label class="abey-login-view__field">
      <span>Password${passMark}</span>
      <input name="password" type="password" autocomplete="current-password" placeholder="Enter Password"${passReq} />
    </label>
    <div class="abey-login-view__meta">
      <label class="abey-login-view__check"><input type="checkbox" /> Remember me</label>
      <a href="#" aria-disabled="true">Forgot password?</a>
    </div>
    <button type="submit">Sign in</button>
    <button type="button" class="abey-login-view__google">Sign in with Google</button>
    <p class="abey-login-view__signup">Don't have an account? <a href="#" aria-disabled="true">Sign up</a></p>
    <p data-role="login-message" class="abey-login-view__message"></p>
  </form>
</section>
`;
}

function buildLoginCss(): string {
  return `.abey-login-view {
  position: relative;
  display: grid;
  gap: 1.1rem;
  max-width: 440px;
  margin: clamp(1.25rem, 8vh, 4.5rem) auto;
  padding: clamp(1.15rem, 2.8vw, 1.7rem);
  border: 1px solid rgba(153, 166, 186, 0.32);
  border-radius: 1.1rem;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 44px rgba(21, 27, 38, 0.18);
}

.abey-login-view::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 12% 86%, rgba(77, 97, 255, 0.74), rgba(77, 97, 255, 0) 54%),
    radial-gradient(circle at 90% 14%, rgba(194, 225, 255, 0.72), rgba(194, 225, 255, 0) 45%),
    linear-gradient(135deg, #5e76ff 0%, #c8e0f5 100%);
}

.abey-login-view__header h1 {
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 1.65rem);
  text-align: center;
  letter-spacing: 0.01em;
}

.abey-login-view__header p {
  margin: 0.35rem 0 0;
  color: var(--abey-text-muted, #5b6472);
  font-size: 0.9rem;
  text-align: center;
}

.abey-login-view__brand {
  justify-self: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  font-size: 0.78rem;
  color: #f3f6ff;
  margin-top: -2.2rem;
  text-shadow: 0 3px 12px rgba(14, 20, 31, 0.32);
}

.abey-login-view__form {
  display: grid;
  gap: 0.85rem;
}

.abey-login-view__field {
  display: grid;
  gap: 0.4rem;
}

.abey-login-view__field span {
  font-size: 0.86rem;
  font-weight: 600;
  color: #2a3342;
}

.abey-login-view__field input {
  width: 100%;
  border: 1px solid rgba(127, 143, 164, 0.42);
  border-radius: 0.65rem;
  padding: 0.64rem 0.78rem;
  background: #fff;
  color: #111827;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.abey-login-view__field input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.abey-login-view__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.78rem;
  color: #6b7280;
}

.abey-login-view__meta a,
.abey-login-view__signup a {
  color: #3b5bff;
  text-decoration: none;
  font-weight: 600;
}

.abey-login-view__meta a:hover,
.abey-login-view__signup a:hover {
  text-decoration: underline;
}

.abey-login-view__check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.abey-login-view__form button {
  border: none;
  border-radius: 0.7rem;
  padding: 0.68rem 0.92rem;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 0.08s ease, filter 0.15s ease;
}

.abey-login-view__form button:hover {
  filter: brightness(1.06);
}

.abey-login-view__form button:active {
  transform: translateY(1px);
}

.abey-login-view__google {
  background: #fff !important;
  color: #1f2937 !important;
  border: 1px solid rgba(127, 143, 164, 0.38) !important;
  font-weight: 600;
}

.abey-login-view__signup {
  margin: 0.2rem 0 0;
  text-align: center;
  font-size: 0.82rem;
  color: #6b7280;
}

.abey-login-view__message {
  min-height: 1.3rem;
  margin: 0.15rem 0 0;
  font-size: 0.9rem;
  text-align: center;
}
`;
}

function buildLoginTs(spec: LoginViewSpec, scaffold: ScaffoldMode): string {
  if (scaffold === "full") {
    return `// AUTO-GENERATED by \`abeyjs generate views\`
import template from "./${spec.fileBase}.html?raw";
import "./${spec.fileBase}.css";
import { performLogin } from "../../../application/use-cases/login.usecase.js";

export function mountLoginView(outlet: HTMLElement): void {
  outlet.innerHTML = template;
  const form = outlet.querySelector<HTMLFormElement>('[data-role="login-form"]');
  const message = outlet.querySelector<HTMLElement>('[data-role="login-message"]');
  if (!form || !message) {
    outlet.textContent = "Could not mount the login view.";
    return;
  }
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    message.textContent = "Validando credenciales...";
    const data = new FormData(form);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (${JSON.stringify(spec.usernameRequired)} && username === "") {
      message.textContent = "Username or email is required.";
      return;
    }
    if (${JSON.stringify(spec.passwordRequired)} && password.trim() === "") {
      message.textContent = "Password is required.";
      return;
    }
    const base = (import.meta.env.VITE_API_URL ?? "").trim();
    const endpoint = ${JSON.stringify(spec.endpointPath)};
    const url = /^https?:\\/\\//.test(endpoint) ? endpoint : \`\${base}\${endpoint}\`;
    const payload: Record<string, string> = {
      ${JSON.stringify(spec.usernameField)}: username,
      ${JSON.stringify(spec.passwordField)}: password,
    };
    try {
      const r = await performLogin({ url, payload });
      message.textContent = r.message;
      if (r.ok) {
        window.location.assign("/home");
      }
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : String(error);
    }
  });
}
`;
  }

  return `// AUTO-GENERATED by \`abeyjs generate views\`
import { createOmegaRuntime } from "@abeyjs/core";
import template from "./${spec.fileBase}.html?raw";
import "./${spec.fileBase}.css";
import { createAppHttp, extractAuthTokens, setAuthToken, setRefreshToken } from "../../omegaCrudConnect.js";

export function mountLoginView(outlet: HTMLElement): void {
  outlet.innerHTML = template;
  const form = outlet.querySelector<HTMLFormElement>('[data-role="login-form"]');
  const message = outlet.querySelector<HTMLElement>('[data-role="login-message"]');
  if (!form || !message) {
    outlet.textContent = "Could not mount the login view.";
    return;
  }
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    message.textContent = "Validando credenciales...";
    const data = new FormData(form);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (${JSON.stringify(spec.usernameRequired)} && username === "") {
      message.textContent = "Username or email is required.";
      return;
    }
    if (${JSON.stringify(spec.passwordRequired)} && password.trim() === "") {
      message.textContent = "Password is required.";
      return;
    }
    const base = (import.meta.env.VITE_API_URL ?? "").trim();
    const endpoint = ${JSON.stringify(spec.endpointPath)};
    const url = /^https?:\\/\\//.test(endpoint) ? endpoint : \`\${base}\${endpoint}\`;
    const payload: Record<string, string> = {
      ${JSON.stringify(spec.usernameField)}: username,
      ${JSON.stringify(spec.passwordField)}: password,
    };
    try {
      const runtime = createOmegaRuntime();
      const http = createAppHttp(runtime, { source: "abeyjs-login", withAuth: false });
      const body = await http.postJson<unknown>(url, payload);
      const tokens = extractAuthTokens(body);
      if (tokens.accessToken) {
        setAuthToken(tokens.accessToken);
      }
      if (tokens.refreshToken) {
        setRefreshToken(tokens.refreshToken);
      }
      message.textContent = tokens.accessToken
        ? "Login correcto. Token guardado en localStorage."
        : "Login correcto.";
      window.location.assign("/home");
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : String(error);
    }
  });
}
`;
}

function buildLoginActionTs(opts: { omegaCrudImport: string }): string {
  return `// AUTO-GENERATED by \`abeyjs generate views\`
import { createOmegaRuntime } from "@abeyjs/core";
import { createAppHttp, extractAuthTokens, setAuthToken, setRefreshToken } from ${JSON.stringify(opts.omegaCrudImport)};

export async function performLogin(input: {
  url: string;
  payload: Record<string, string>;
}): Promise<{ ok: boolean; message: string }> {
  const runtime = createOmegaRuntime();
  const http = createAppHttp(runtime, { source: "abeyjs-login", withAuth: false });
  const body = await http.postJson<unknown>(input.url, input.payload);
  const tokens = extractAuthTokens(body);
  if (tokens.accessToken) {
    setAuthToken(tokens.accessToken);
  }
  if (tokens.refreshToken) {
    setRefreshToken(tokens.refreshToken);
  }
  return {
    ok: Boolean(tokens.accessToken),
    message: tokens.accessToken
      ? "Login correcto. Token guardado en localStorage."
      : "Login correcto.",
  };
}
`;
}

function detectLoginViews(contract: ConnectContract, cfg: ConnectYamlConfig): LoginViewSpec[] {
  const out: LoginViewSpec[] = [];
  for (const entity of contract.entities) {
    const entityCfg = resolveEntityConfig(entity, cfg);
    const effectiveType = entityCfg.type ?? entity.type;
    const endpointPath = entityCfg.endpointPath?.trim() || entity.routeBase;
    const txt = `${entity.name} ${endpointPath}`.toLowerCase();
    const looksLikeLogin = /login|signin|sign-in|auth|token/.test(txt);
    if (!looksLikeLogin) {
      continue;
    }
    if (effectiveType !== "action" && effectiveType !== "service" && effectiveType !== "crud") {
      continue;
    }
    const modelNames = Object.keys(entity.model);
    const usernameField =
      modelNames.find((n) => /user(name)?|email|login/.test(n.toLowerCase())) ?? "username";
    const passwordField =
      modelNames.find((n) => /pass(word)?|clave/.test(n.toLowerCase())) ?? "password";
    const usernameRequired = entity.model[usernameField]?.required ?? true;
    const passwordRequired = entity.model[passwordField]?.required ?? true;
    const base = kebab(entity.name);
    const fileBase = base.includes("login") ? base : `${base}-login`;
    const configuredRoute = entityCfg.route?.trim();
    const defaultCrudRoute = `/crud/${entity.name.toLowerCase()}`;
    const rawRoute =
      !configuredRoute || configuredRoute === defaultCrudRoute ? "/login" : configuredRoute;
    out.push({
      entityName: entity.name,
      fileBase,
      route: rawRoute.startsWith("/") ? rawRoute : `/${rawRoute}`,
      menuLabel: entityCfg.menuLabel?.trim() || "Login",
      endpointPath,
      usernameField,
      passwordField,
      usernameRequired,
      passwordRequired,
    });
  }
  return out;
}

function buildUiOverrides(entity: EntityContract, fieldsCfg: Record<string, FieldUiConfig> | undefined): string {
  const fieldNames = fieldsCfg ? Object.keys(fieldsCfg) : Object.keys(entity.model);
  const entries = fieldNames.map((name) => {
    const cfg = fieldsCfg?.[name];
    const meta = entity.model[name];
    if (!meta) {
      return "";
    }
    return `  ${JSON.stringify(name)}: {
    source: ${JSON.stringify(cfg?.source ?? name)},
    label: ${JSON.stringify(cfg?.label ?? name)},
    kind: ${JSON.stringify(toFieldKind(name, cfg?.dataType ?? meta?.type, cfg?.widget, meta?.format))},
    selectOptions: ${cfg?.widget === "select" && cfg.options
      ? JSON.stringify({
          endpoint: cfg.options.endpoint,
          valueField: cfg.options.valueField,
          labelField: cfg.options.labelField,
          dataPath: cfg.options.dataPath,
        })
      : "undefined"},
  },`;
  }).filter((e) => e !== "");
  return `const fieldUiOverrides: OpenApiCrudFieldUiOverrides = {\n${entries.join("\n")}\n};`;
}

function buildCrudBehaviorOverrides(entityCfg: EntityUiConfig): string {
  const update = entityCfg.operations?.update;
  const del = entityCfg.operations?.delete;
  const response = entityCfg.response;
  const request = entityCfg.request;
  const lines: string[] = [];
  if (response?.listDataPath?.trim()) {
    lines.push(`  listDataPath: ${JSON.stringify(response.listDataPath.trim())},`);
  }
  if (response?.totalPath?.trim()) {
    lines.push(`  listTotalPath: ${JSON.stringify(response.totalPath.trim())},`);
  }
  if (response?.pagePath?.trim()) {
    lines.push(`  listPagePath: ${JSON.stringify(response.pagePath.trim())},`);
  }
  if (response?.pageSizePath?.trim()) {
    lines.push(`  listPageSizePath: ${JSON.stringify(response.pageSizePath.trim())},`);
  }
  if (response?.totalPagesPath?.trim()) {
    lines.push(`  listTotalPagesPath: ${JSON.stringify(response.totalPagesPath.trim())},`);
  }
  if (request?.pageParam?.trim()) {
    lines.push(`  listPageParam: ${JSON.stringify(request.pageParam.trim())},`);
  }
  if (request?.pageSizeParam?.trim()) {
    lines.push(`  listPageSizeParam: ${JSON.stringify(request.pageSizeParam.trim())},`);
  }
  if (request?.pageBase != null) {
    // `DiscoveredCrud.listPageBase` only allows 0|1 (or undefined). Keep it typed as a literal.
    if (request.pageBase === 0 || request.pageBase === 1) {
      lines.push(`  listPageBase: ${request.pageBase} as const,`);
    }
  }
  if (update?.method) {
    lines.push(`  updateMethod: ${JSON.stringify(update.method)},`);
  }
  if (update?.path?.trim()) {
    lines.push(`  itemPathTemplate: ${JSON.stringify(update.path.trim())},`);
  }
  if (update?.idSource) {
    lines.push(`  itemIdSource: ${JSON.stringify(update.idSource)},`);
  }
  if (update?.idField?.trim()) {
    lines.push(`  itemIdField: ${JSON.stringify(update.idField.trim())},`);
  }
  if (update?.idParam?.trim()) {
    lines.push(`  itemPathParamName: ${JSON.stringify(update.idParam.trim())},`);
  }
  if (del?.method) {
    lines.push(`  deleteMethod: ${JSON.stringify(del.method)},`);
  }
  if (del?.path?.trim()) {
    lines.push(`  deletePathTemplate: ${JSON.stringify(del.path.trim())},`);
  }
  if (del?.idSource) {
    lines.push(`  itemIdSource: ${JSON.stringify(del.idSource)},`);
  }
  if (del?.idField?.trim()) {
    lines.push(`  itemIdField: ${JSON.stringify(del.idField.trim())},`);
  }
  if (del?.idParam?.trim()) {
    lines.push(`  itemPathParamName: ${JSON.stringify(del.idParam.trim())},`);
  }
  return lines.length > 0
    ? `const crudBehaviorOverrides: OpenApiCrudListBehaviorOverrides = {\n${lines.join("\n")}\n};`
    : `const crudBehaviorOverrides: OpenApiCrudListBehaviorOverrides = {};`;
}

function buildEntityTs(
  entity: EntityContract,
  menuLabel: string,
  entityCfg: EntityUiConfig,
  appCfg: ConnectYamlConfig["app"],
  scaffold: ScaffoldMode,
): string {
  const sourceEntity = entityCfg.sourceEntity?.trim() || entity.name;
  const endpointPath = entityCfg.endpointPath?.trim() || entity.routeBase;
  const requiredFields = Object.entries(entity.model)
    .filter(([, m]) => m.required)
    .map(([name]) => name);
  const showToolbar = entityCfg.showToolbar ?? appCfg?.showToolbar ?? true;
  const showTrace = entityCfg.showTrace ?? appCfg?.showTrace ?? false;
  const showFlowMessage = entityCfg.showFlowMessage ?? appCfg?.showFlowMessage ?? false;
  const fn = `mount${entity.name}CrudView`;
  if (scaffold === "full") {
    return `// AUTO-GENERATED by \`abeyjs generate views\`
import { intentOf } from "@abeyjs/core";
import { mountOpenApiCrudView, type OpenApiCrudListBehaviorOverrides } from "@abeyjs/openapi";
import type { OpenApiCrudFieldUiOverrides } from "@abeyjs/view";
import template from "./${kebab(entity.name)}.html?raw";
import "./${kebab(entity.name)}.css";
import { ensureAuthenticated } from "../../app/omegaCrudConnect.js";
import { load${entity.name}Crud } from "../../application/use-cases/${kebab(entity.name)}.crud.usecase.js";

${buildUiOverrides(entity, entityCfg.fields)}
${buildCrudBehaviorOverrides(entityCfg)}
const requiredFormFields = new Set<string>(${JSON.stringify(requiredFields)});

export function ${fn}(outlet: HTMLElement): (() => void) | void {
  if (!ensureAuthenticated()) {
    outlet.textContent = "Redirigiendo a login...";
    return;
  }
  let disposed = false;
  let cleanup: (() => void) | undefined;
  outlet.innerHTML = template;
  const host = outlet.querySelector<HTMLElement>('[data-role="crud-host"]');
  if (!host) {
    outlet.textContent = "Could not mount the CRUD view.";
    return;
  }
  host.textContent = "Cargando ${menuLabel}...";
  void (async () => {
    try {
      const b = await load${entity.name}Crud();
      if (disposed) {
        return;
      }
      const item = b.item;
      if (!item) {
        host.textContent = "No entity/path found for ${entity.name} in the connected OpenAPI contract.";
        return;
      }
      const listFields = item.discovered.listView.fields
      .filter((f) => (f.name in fieldUiOverrides) || (f.name !== ${JSON.stringify(entity.rowKey)} && /id$/i.test(f.name)))
      .map((f) => ({
        ...f,
        name: fieldUiOverrides[f.name]?.source ?? f.name,
        label: fieldUiOverrides[f.name]?.label ?? f.label,
        kind: fieldUiOverrides[f.name]?.kind ?? f.kind ?? "text",
        selectOptions: fieldUiOverrides[f.name]?.selectOptions,
      }));
      const formFields = item.discovered.formView.fields
      .filter((f) => (f.name in fieldUiOverrides) || requiredFormFields.has(f.name) || (f.name !== ${JSON.stringify(entity.rowKey)} && /id$/i.test(f.name)))
      .map((f) => ({
        ...f,
        name: fieldUiOverrides[f.name]?.source ?? f.name,
        label: fieldUiOverrides[f.name]?.label ?? f.label,
        kind: fieldUiOverrides[f.name]?.kind ?? f.kind ?? "text",
        selectOptions: fieldUiOverrides[f.name]?.selectOptions,
      }));
      const mounted = mountOpenApiCrudView({
        root: host,
        discovered: {
          ...item.discovered,
          ...crudBehaviorOverrides,
          listView: { ...item.discovered.listView, fields: listFields },
          formView: { ...item.discovered.formView, fields: formFields },
        },
        agent: item.agent,
        runtime: b.runtime,
        listIntent: item.listIntent,
        createIntent: item.createIntent,
        updateIntent: item.updateIntent,
        deleteIntent: item.deleteIntent,
        showToolbar: ${JSON.stringify(showToolbar)},
        showTrace: ${JSON.stringify(showTrace)},
        showFlowMessage: ${JSON.stringify(showFlowMessage)},
      });
      cleanup = mounted.dispose;
      void b.runtime.dispatch(intentOf(item.listIntent, undefined), { source: "crud-generated" });
    } catch (error) {
      if (disposed) {
        return;
      }
      host.textContent = error instanceof Error ? error.message : String(error);
    }
  })();
  return () => {
    disposed = true;
    cleanup?.();
  };
}
`;
  }

  return `// AUTO-GENERATED by \`abeyjs generate views\`
import { intentOf } from "@abeyjs/core";
import { mountOpenApiCrudView, type OpenApiCrudListBehaviorOverrides } from "@abeyjs/openapi";
import type { OpenApiCrudFieldUiOverrides } from "@abeyjs/view";
import template from "./${kebab(entity.name)}.html?raw";
import "./${kebab(entity.name)}.css";
import { ensureAuthenticated, initConnectedCrud } from "../../omegaCrudConnect.js";

${buildUiOverrides(entity, entityCfg.fields)}
${buildCrudBehaviorOverrides(entityCfg)}
const requiredFormFields = new Set<string>(${JSON.stringify(requiredFields)});

export function ${fn}(outlet: HTMLElement): (() => void) | void {
  if (!ensureAuthenticated()) {
    outlet.textContent = "Redirigiendo a login...";
    return;
  }
  let disposed = false;
  let cleanup: (() => void) | undefined;
  outlet.innerHTML = template;
  const host = outlet.querySelector<HTMLElement>('[data-role="crud-host"]');
  if (!host) {
    outlet.textContent = "Could not mount the CRUD view.";
    return;
  }
  host.textContent = "Cargando ${menuLabel}...";
  void (async () => {
    try {
      const b = await initConnectedCrud();
      if (disposed) {
        return;
      }
      const item =
        b.items.find((it) => it.discovered.path === ${JSON.stringify(endpointPath)}) ??
        b.items.find((it) => it.discovered.entityPascal === ${JSON.stringify(sourceEntity)});
      if (!item) {
        host.textContent = "No entity/path found for ${entity.name} in the connected OpenAPI contract.";
        return;
      }
      const listFields = item.discovered.listView.fields
      .filter((f) => (f.name in fieldUiOverrides) || (f.name !== ${JSON.stringify(entity.rowKey)} && /id$/i.test(f.name)))
      .map((f) => ({
        ...f,
        name: fieldUiOverrides[f.name]?.source ?? f.name,
        label: fieldUiOverrides[f.name]?.label ?? f.label,
        kind: fieldUiOverrides[f.name]?.kind ?? f.kind ?? "text",
        selectOptions: fieldUiOverrides[f.name]?.selectOptions,
      }));
      const formFields = item.discovered.formView.fields
      .filter((f) => (f.name in fieldUiOverrides) || requiredFormFields.has(f.name) || (f.name !== ${JSON.stringify(entity.rowKey)} && /id$/i.test(f.name)))
      .map((f) => ({
        ...f,
        name: fieldUiOverrides[f.name]?.source ?? f.name,
        label: fieldUiOverrides[f.name]?.label ?? f.label,
        kind: fieldUiOverrides[f.name]?.kind ?? f.kind ?? "text",
        selectOptions: fieldUiOverrides[f.name]?.selectOptions,
      }));
      const mounted = mountOpenApiCrudView({
        root: host,
        discovered: {
          ...item.discovered,
          ...crudBehaviorOverrides,
          listView: { ...item.discovered.listView, fields: listFields },
          formView: { ...item.discovered.formView, fields: formFields },
        },
        agent: item.agent,
        runtime: b.runtime,
        listIntent: item.listIntent,
        createIntent: item.createIntent,
        updateIntent: item.updateIntent,
        deleteIntent: item.deleteIntent,
        showToolbar: ${JSON.stringify(showToolbar)},
        showTrace: ${JSON.stringify(showTrace)},
        showFlowMessage: ${JSON.stringify(showFlowMessage)},
      });
      cleanup = mounted.dispose;
      void b.runtime.dispatch(intentOf(item.listIntent, undefined), { source: "crud-generated" });
    } catch (error) {
      if (disposed) {
        return;
      }
      host.textContent = error instanceof Error ? error.message : String(error);
    }
  })();
  return () => {
    disposed = true;
    cleanup?.();
  };
}
`;
}

function buildCrudActionTs(entity: EntityContract, entityCfg: EntityUiConfig, opts: { omegaCrudImport: string }): string {
  const sourceEntity = entityCfg.sourceEntity?.trim() || entity.name;
  const endpointPath = entityCfg.endpointPath?.trim() || entity.routeBase;
  return `// AUTO-GENERATED by \`abeyjs generate views\`
import { initConnectedCrud } from ${JSON.stringify(opts.omegaCrudImport)};
import type { OpenApiRegisterOk } from "@abeyjs/openapi";
import type { OmegaRuntime } from "@abeyjs/core";

export async function load${entity.name}Crud(): Promise<{ runtime: OmegaRuntime; item: OpenApiRegisterOk | null }> {
  const b = await initConnectedCrud();
  const item =
    b.items.find((it) => it.discovered.path === ${JSON.stringify(endpointPath)}) ??
    b.items.find((it) => it.discovered.entityPascal === ${JSON.stringify(sourceEntity)});
  return { runtime: b.runtime, item: item ?? null };
}
`;
}

function buildRouteBlock(
  contract: ConnectContract,
  routeMap: Map<string, { route: string; menuLabel: string }>,
  scaffold: ScaffoldMode,
): string {
  const lines: string[] = [];
  lines.push(`    ${START}`);
  for (const entity of contract.entities) {
    const info = routeMap.get(entity.name);
    if (!info) {
      continue;
    }
    const fileBase = kebab(entity.name);
    const exportName = `mount${entity.name}CrudView`;
    const importPrefix = scaffold === "full" ? "../ui/views" : "./views";
    lines.push("    {");
    lines.push(`      path: ${JSON.stringify(info.route)},`);
    lines.push(`      label: ${JSON.stringify(info.menuLabel)},`);
    lines.push(`      title: ${JSON.stringify(info.menuLabel)},`);
    lines.push(`      navIconFa: "fa-solid fa-database",`);
    lines.push(
      `      mount: lazyViewMount(() => import("${importPrefix}/${fileBase}/${fileBase}.js"), ${JSON.stringify(exportName)}),`,
    );
    lines.push("    },");
  }
  lines.push(`    ${END}`);
  return lines.join("\n");
}

async function patchRoutes(
  targetDir: string,
  contract: ConnectContract,
  routeMap: Map<string, { route: string; menuLabel: string }>,
  scaffold: ScaffoldMode,
): Promise<void> {
  const routesPath =
    scaffold === "full"
      ? join(resolve(targetDir), "src", "app", "routes.ts")
      : join(resolve(targetDir), "src", "routes.ts");
  let routes = await readFile(routesPath, "utf-8");
  if (!/import\s+\{[^}]*\blazyViewMount\b[^}]*\}\s+from\s+"@abeyjs\/view";/.test(routes)) {
    routes = `import { lazyViewMount } from "@abeyjs/view";\n${routes}`;
  }
  if (routeMap.has("__login__")) {
    const guardImport = scaffold === "full" ? "./omegaCrudConnect.js" : "./omegaCrudConnect.js";
    if (!routes.includes(`from "${guardImport}"`)) {
      routes = `import { withAuthGuard } from "${guardImport}";\n${routes}`;
    }
    routes = routes.replace(
      /(\{\s*path:\s*")\/("\s*,[\s\S]*?mount:\s*)mountHome(\s*,[\s\S]*?\})/m,
      `$1/home$2withAuthGuard(mountHome)$3`,
    );
  }
  const block = buildRouteBlock(contract, routeMap, scaffold);
  if (routes.includes(START) && routes.includes(END)) {
    routes = routes.replace(
      new RegExp(`${START}[\\s\\S]*${END}`, "m"),
      `${START}\n${block.split("\n").slice(1, -1).join("\n")}\n    ${END}`,
    );
  } else {
    const match = routes.match(/\s+pageRoute\(\s*[\r]?\n\s*"\*",/m);
    if (!match || !match[0]) {
      throw new Error("Could not find the 404 pageRoute block in routes.ts to insert CRUD routes.");
    }
    routes = routes.replace(match[0], `${block}\n${match[0]}`);
  }
  await writeFile(routesPath, routes, "utf-8");
}

async function ensureMainStandaloneLogin(targetDir: string, withLogin: boolean, scaffold: ScaffoldMode): Promise<void> {
  if (!withLogin) {
    return;
  }
  const mainPath = join(resolve(targetDir), "src", "main.ts");
  const main = await readFile(mainPath, "utf-8").catch(() => "");
  if (!main.includes('import { mountRoutedApp } from "@abeyjs/view";')) {
    return;
  }
  const routesImport = scaffold === "full" ? "./app/routes.js" : "./routes.js";
  const sessionImport = "./services/session.js";
  const loginImport = scaffold === "full" ? "./ui/views/login/login.js" : "./views/login/login.js";
  const next = `import { mountRoutedApp } from "@abeyjs/view";
import "@abeyjs/view/theme/omega-default.css";
import { getRoutes } from "${routesImport}";
import { clearSession, hasSession } from "${sessionImport}";
import { mountLoginView } from "${loginImport}";

const app = document.getElementById("app");
if (!app) {
  throw new Error("Falta #app en index.html");
}

const path = window.location.pathname;
if (path === "/" || path === "/login") {
  if (hasSession()) {
    window.location.replace("/home");
  } else {
    mountLoginView(app);
  }
} else {
  const { router, dispose } = mountRoutedApp(app, {
    brand: "Lector",
    subBrand: "admin",
    variant: "admin",
    dashboardLayout: true,
    logoMark: "Lector.",
    appDocumentTitle: "AbeyJs",
    routes: getRoutes(),
    appBarActions: [
      {
        ariaLabel: "Sign out",
        icon: "⎋",
        onClick: () => {
          clearSession();
          window.location.assign("/login");
        },
      },
    ],
  });

  if (import.meta.env.DEV) {
    (globalThis as unknown as { __abeyRouter?: unknown }).__abeyRouter = router;
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      dispose();
    });
  }
}
`;
  await writeFile(mainPath, next, "utf-8");
}

async function ensureEnvFiles(targetDir: string, contract: ConnectContract, cfg: ConnectYamlConfig): Promise<void> {
  const root = resolve(targetDir);
  const configuredOpenApi = cfg.app?.openApiUrl?.trim() || contract.source.swaggerUrl;
  const normalizedOpenApi = normalizeOpenApiForClient(configuredOpenApi);
  const lines = [
    "# AbeyJs connect",
    `VITE_OPENAPI_URL=${normalizedOpenApi}`,
    `VITE_API_URL=${cfg.app?.apiBaseUrl?.trim() || ""}`,
    "",
  ].join("\n");
  await writeFile(join(root, ".env.example"), lines, "utf-8");
  const envPath = join(root, ".env");
  const envCurrent = await readFile(envPath, "utf-8").catch(() => "");
  if (envCurrent.trim() === "" || envCurrent.startsWith("# AbeyJs connect")) {
    await writeFile(envPath, lines, "utf-8");
  }
}

function normalizeOpenApiForClient(urlOrPath: string): string {
  const v = urlOrPath.trim();
  if (!/^https?:\/\//i.test(v)) {
    return v;
  }
  try {
    const u = new URL(v);
    return `${u.pathname}${u.search}`;
  } catch {
    return v;
  }
}

function inferProxyTarget(urlOrPath: string): string | null {
  const v = urlOrPath.trim();
  if (!/^https?:\/\//i.test(v)) {
    return null;
  }
  try {
    const u = new URL(v);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function ensureViteProxy(targetDir: string, contract: ConnectContract, cfg: ConnectYamlConfig): Promise<void> {
  const configuredOpenApi = cfg.app?.openApiUrl?.trim() || contract.source.swaggerUrl;
  const proxyTarget = inferProxyTarget(configuredOpenApi);
  if (!proxyTarget) {
    return;
  }
  const vitePath = join(resolve(targetDir), "vite.config.ts");
  let vite = await readFile(vitePath, "utf-8");
  if (vite.includes("abeyjs-connect-proxy")) {
    return;
  }
  const t = JSON.stringify(proxyTarget);
  const pxy = `// @abeyjs-connect-proxy
    proxy: {
      "^/api(?:/|$)": { target: ${t}, changeOrigin: true, secure: false },
      "/swagger": { target: ${t}, changeOrigin: true, secure: false },
    },`;
  if (/server:\s*\{\s*port:\s*(\d+)\s*\}/.test(vite)) {
    vite = vite.replace(/server:\s*\{\s*port:\s*(\d+)\s*\}/, `server: { port: $1, ${pxy} }`);
  } else {
    vite = vite.replace(
      /export default defineConfig\(\{/,
      `export default defineConfig({
  server: {${pxy} },`,
    );
  }
  await writeFile(vitePath, vite, "utf-8");
}

async function ensureDependencies(targetDir: string): Promise<void> {
  const pkgPath = join(resolve(targetDir), "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  pkg.dependencies = {
    ...pkg.dependencies,
    "@abeyjs/http": "^0.1.0",
    "@abeyjs/openapi": "^0.1.0",
  };
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}

async function ensureEnvTypes(targetDir: string): Promise<void> {
  const p = join(resolve(targetDir), "src", "env.d.ts");
  const raw = await readFile(p, "utf-8").catch(() => `/// <reference types="vite/client" />\n`);
  if (raw.includes('declare module "*.html?raw"')) {
    await writeFile(p, raw, "utf-8");
    return;
  }
  const next = `${raw.trimEnd()}\n` +
    `declare module "*.html?raw" {\n` +
    `  const html: string;\n` +
    `  export default html;\n` +
    `}\n`;
  await writeFile(p, next, "utf-8");
}

export async function runGenerateViews(targetDir: string): Promise<{
  generatedEntities: string[];
}> {
  return runGenerateViewsWithOptions(targetDir, { scaffold: "minimal" });
}

export async function listCrudCandidates(targetDir: string): Promise<string[]> {
  const root = resolve(targetDir);
  const contract = await readConnectContract(root);
  const cfg = await readYamlConfig(root);
  const errors = validateYamlConfig(contract, cfg);
  if (errors.length > 0) {
    throw new Error(`Invalid abeyjs.connect.yml:\n- ${errors.join("\n- ")}`);
  }
  const names: string[] = [];
  for (const entity of contract.entities) {
    const entityCfg = resolveEntityConfig(entity, cfg);
    const effectiveType = entityCfg.type ?? entity.type;
    if (effectiveType === "crud") {
      names.push(entity.name);
    }
  }
  return names;
}

export async function runGenerateViewsWithOptions(
  targetDir: string,
  options: { onlyEntities?: string[]; scaffold?: ScaffoldMode },
): Promise<{ generatedEntities: string[] }> {
  const root = resolve(targetDir);
  const scaffold: ScaffoldMode = options.scaffold ?? "minimal";
  await ensureAppScaffold(root, scaffold);
  const contract = await readConnectContract(root);
  const cfg = await readYamlConfig(root);
  const errors = validateYamlConfig(contract, cfg);
  if (errors.length > 0) {
    throw new Error(`Invalid abeyjs.connect.yml:\n- ${errors.join("\n- ")}`);
  }

  if (scaffold === "full") {
    // Optional richer layers (safe: never overwrite non-empty user files)
    await writeIfMissing(
      join(root, "src", "infra", "generated", "openapi", "catalog.ts"),
      buildGeneratedApiCatalogTs(contract, { omegaCrudImport: "../../app/omegaCrudConnect.js" }),
    );
    await writeIfMissing(join(root, "src", "infra", "generated", "openapi", "index.ts"), `export * from "./catalog.js";\n`);
    await writeIfMissing(join(root, "src", "infra", "api", "operations.ts"), buildApiOperationsTs({ catalogImport: "../generated/openapi/catalog.js" }));
  }

  const selected = options.onlyEntities ? new Set(options.onlyEntities) : null;
  const loginViews = detectLoginViews(contract, cfg);
  const refreshTokenEndpoint = detectRefreshTokenEndpoint(contract, cfg);
  await ensureDependencies(root);
  await ensureEnvTypes(root);
  await ensureEnvFiles(root, contract, cfg);
  await ensureViteProxy(root, contract, cfg);
  const omegaCrudPath = scaffold === "full" ? join(root, "src", "app", "omegaCrudConnect.ts") : join(root, "src", "omegaCrudConnect.ts");
  await mkdir(join(root, "src", "services"), { recursive: true });
  await writeFile(join(root, "src", "services", "session.ts"), buildSessionTs(), "utf-8");
  await writeFile(join(root, "src", "services", "http.ts"), buildServicesHttpTs(refreshTokenEndpoint), "utf-8");
  await writeFile(omegaCrudPath, buildOmegaCrudConnectTs(refreshTokenEndpoint, scaffold), "utf-8");

  const routeMap = new Map<string, { route: string; menuLabel: string }>();
  const generatedEntities: string[] = [];
  if (loginViews.length > 0) {
    const loginDir =
      scaffold === "full" ? join(root, "src", "ui", "views", "login") : join(root, "src", "views", "login");
    await mkdir(loginDir, { recursive: true });
    const spec = loginViews[0]!;
    await writeFile(join(loginDir, "login.html"), buildLoginHtml(spec), "utf-8");
    await writeFile(join(loginDir, "login.css"), buildLoginCss(), "utf-8");
    await writeFile(join(loginDir, "login.ts"), buildLoginTs({ ...spec, fileBase: "login" }, scaffold), "utf-8");
    if (scaffold === "full") {
      await writeIfMissing(join(root, "src", "application", "use-cases", "login.usecase.ts"), buildLoginActionTs({ omegaCrudImport: "../../app/omegaCrudConnect.js" }));
    }
    routeMap.set("__login__", { route: spec.route, menuLabel: spec.menuLabel });
    generatedEntities.push(`Login(${spec.entityName})`);
  }
  for (const entity of contract.entities) {
    const entityCfg = resolveEntityConfig(entity, cfg);
    const effectiveType = entityCfg.type ?? entity.type;
    if (effectiveType !== "crud") {
      continue;
    }
    if (selected && !selected.has(entity.name)) {
      continue;
    }
    const menuLabel = entityCfg.menuLabel?.trim() || entity.name;
    const route = routeForEntity(entity, entityCfg.route);
    routeMap.set(entity.name, { route, menuLabel });

    const dir =
      scaffold === "full"
        ? join(root, "src", "ui", "views", kebab(entity.name))
        : join(root, "src", "views", kebab(entity.name));
    await mkdir(dir, { recursive: true });
    const base = kebab(entity.name);
    await writeFile(join(dir, `${base}.html`), buildEntityHtml(entity, menuLabel), "utf-8");
    await writeFile(join(dir, `${base}.css`), buildEntityCss(), "utf-8");
    await writeFile(
      join(dir, `${base}.ts`),
      buildEntityTs(entity, menuLabel, entityCfg, cfg.app, scaffold),
      "utf-8",
    );
    if (scaffold === "full") {
      await writeIfMissing(
        join(root, "src", "application", "use-cases", `${kebab(entity.name)}.crud.usecase.ts`),
        buildCrudActionTs(entity, entityCfg, { omegaCrudImport: "../../app/omegaCrudConnect.js" }),
      );
      await writeIfMissing(
        join(root, "src", "domain", "resources", `${kebab(entity.name)}.resource.ts`),
        buildResourceFileTs(entity, entityCfg),
      );
    }
    generatedEntities.push(entity.name);
  }

  if (scaffold === "full") {
    // Resources barrel (only if missing/empty)
    const resourceExports = contract.entities
      .filter((e) => {
        const ec = resolveEntityConfig(e, cfg);
        const t = ec.type ?? e.type;
        return t === "crud";
      })
      .map((e) => `export * from "./${kebab(e.name)}.resource.js";`)
      .join("\n");
    await writeIfMissing(join(root, "src", "domain", "resources", "index.ts"), `${resourceExports}\n`);
  }

  if (generatedEntities.length === 0) {
    throw new Error("No `crud` entities selected in .abeyjs/connect.json / abeyjs.connect.yml.");
  }

  await patchRoutes(root, contract, routeMap, scaffold);
  await ensureMainStandaloneLogin(root, loginViews.length > 0, scaffold);
  return { generatedEntities };
}

