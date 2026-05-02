import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export type AddOpenapiOpts = {
  proxyTarget: string;
  openApiPath: string;
};

const MARK = "ABEYJS-OPENAPI-WIRE";

/**
 * Adds dependencies, Vite proxy entries, `.env.example`, `omegaSetup` helpers, `views/crud-api/crud-api.ts`,
 * and inserts `/crud-api` routes when missing. Ensure `src/main.ts` calls async `initOpenApi` if the app
 * still boots through `createOmega` without the OpenAPI marker.
 */
export async function addOpenapiToApp(targetDir: string, opts: AddOpenapiOpts): Promise<void> {
  const root = resolve(targetDir);

  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8")) as { dependencies?: Record<string, string> };
  pkg.dependencies = {
    ...pkg.dependencies,
    "@abeyjs/openapi": "^0.1.0",
    "@abeyjs/http": "^0.1.0",
  };
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

  const vitePath = join(root, "vite.config.ts");
  let vite = await readFile(vitePath, "utf-8");
  if (!vite.includes("abeyjs-openapi-proxy")) {
    const t = JSON.stringify(opts.proxyTarget);
    const pxy = `// @abeyjs-openapi-proxy
    proxy: {
      "^/api(?:/|$)": { target: ${t}, changeOrigin: true, secure: false },
      "/swagger": { target: ${t}, changeOrigin: true, secure: false },
    },`;
    if (/server:\s*\{\s*port:\s*(\d+)\s*\}/.test(vite)) {
      vite = vite.replace(
        /server:\s*\{\s*port:\s*(\d+)\s*\}/,
        `server: { port: $1, ${pxy} }`,
      );
    } else {
      vite = vite.replace(
        /export default defineConfig\(\{/,
        `export default defineConfig({
  server: {${pxy} },`,
      );
    }
    await writeFile(vitePath, vite, "utf-8");
  }

  await writeFile(
    join(root, ".env.example"),
    [
      "# Vite: proxy target (see vite.config).",
      `VITE_OPENAPI_URL=${opts.openApiPath}`,
      "VITE_API_URL=",
      "",
    ].join("\n"),
    "utf-8",
  );

  const osPath = join(root, "src", "omegaSetup.ts");
  const omOld = await readFile(osPath, "utf-8").catch(() => "");
  if (!omOld.includes(MARK)) {
    const omega = `// ${MARK} — \`abeyjs add openapi\`
import { createOmegaRuntime, type OmegaRuntime } from "@abeyjs/core";
import { createOmegaHttp } from "@abeyjs/http";
import { registerOpenApiCrud, type OpenApiRegisterOk } from "@abeyjs/openapi";

const env = import.meta.env as { VITE_OPENAPI_URL?: string; VITE_API_URL?: string };

export async function loadOpenApiSpec(): Promise<Record<string, unknown>> {
  const u = env.VITE_OPENAPI_URL;
  if (u == null || String(u).trim() === "") {
    throw new Error("Set VITE_OPENAPI_URL (see .env.example).");
  }
  const r = await fetch(String(u), { credentials: "omit" });
  if (!r.ok) {
    throw new Error(\`OpenAPI: \${r.status} \${r.statusText}\`);
  }
  return (await r.json()) as Record<string, unknown>;
}

export type AppWithOpenApi = OpenApiRegisterOk & { runtime: OmegaRuntime; spec: Record<string, unknown> };

let cached: AppWithOpenApi | undefined;

export async function initOpenApi(): Promise<AppWithOpenApi> {
  if (cached) {
    return cached;
  }
  const spec = await loadOpenApiSpec();
  const runtime = createOmegaRuntime();
  const base = (env.VITE_API_URL as string | undefined) ?? "";
  const http = createOmegaHttp({ channel: runtime.channel, baseUrl: base, source: "abeyjs-app" });
  const reg = registerOpenApiCrud({ spec, runtime, http, useMemoryOnApiFailure: true });
  if (!reg.ok) {
    throw new Error(reg.error);
  }
  cached = { ...reg, spec, runtime };
  return cached;
}

export function getOpenApi(): AppWithOpenApi {
  if (!cached) {
    throw new Error("initOpenApi() has not run yet.");
  }
  return cached;
}
`;
    await writeFile(osPath, omega, "utf-8");
  }

  await mkdir(join(root, "src", "views", "crud-api"), { recursive: true });
  const crud = `// ${MARK}
import { intentOf } from "@abeyjs/core";
import { mountOpenApiCrudView } from "@abeyjs/openapi";
import { getOpenApi } from "../../omegaSetup.js";

export function mountCrudOpenApiView(outlet: HTMLElement): (() => void) | void {
  const b = getOpenApi();
  const m = mountOpenApiCrudView({
    root: outlet,
    discovered: b.discovered,
    agent: b.agent,
    runtime: b.runtime,
    listIntent: b.listIntent,
    createIntent: b.createIntent,
    updateIntent: b.updateIntent,
    deleteIntent: b.deleteIntent,
    showToolbar: true,
    showTrace: true,
    showFlowMessage: true,
  });
  void b.runtime.dispatch(intentOf(b.listIntent, undefined), { source: "crud-api" });
  return m.dispose;
}
`;
  await writeFile(join(root, "src", "views", "crud-api", "crud-api.ts"), crud, "utf-8");

  const routesPath = join(root, "src", "routes.ts");
  const routes = await readFile(routesPath, "utf-8");
  if (!routes.includes("crud-api") && !routes.includes("mountCrudOpenApiView")) {
    const needle = `    pageRoute(
      "*",`;
    if (routes.includes(needle)) {
      const block = `    {
      path: "/crud-api",
      label: "CRUD (API)",
      title: "CRUD (OpenAPI)",
      navIconFa: "fa-solid fa-bolt",
      mount: lazyViewMount(
        () => import("./views/crud-api/crud-api.js"),
        "mountCrudOpenApiView",
      ),
    },
    {
      path: "/api-crud",
      label: "",
      title: "CRUD (OpenAPI)",
      showInNav: false,
      mount: lazyViewMount(
        () => import("./views/crud-api/crud-api.js"),
        "mountCrudOpenApiView",
      ),
    },
`;
      await writeFile(routesPath, routes.replace(needle, block + needle), "utf-8");
    }
  }

  const mainPath = join(root, "src", "main.ts");
  const main = await readFile(mainPath, "utf-8").catch(() => "");
  if (main && !main.includes(MARK) && !main.includes("initOpenApi")) {
    // eslint-disable-next-line no-console
    console.warn(
      "abeyjs add openapi: switch src/main.ts from `createOmega` to async `initOpenApi` — see examples for a reference main.ts.",
    );
  }
}
