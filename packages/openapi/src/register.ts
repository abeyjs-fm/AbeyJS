import type { OmegaChannel } from "@abeyjs/core";
import type { OmegaRuntime } from "@abeyjs/runtime";
import type { OmegaHttp } from "@abeyjs/http";
import { discoverAllCrud, discoverFirstCrud, type DiscoveredCrud } from "./discover-crud.js";
import { DynamicCrudAgent, type OpenApiRow } from "./dynamic-crud-agent.js";

export interface OpenApiRegisterOk {
  ok: true;
  discovered: DiscoveredCrud;
  agent: DynamicCrudAgent;
  listIntent: string;
  createIntent: string;
  updateIntent?: string;
  deleteIntent?: string;
}

export interface OpenApiRegisterErr {
  ok: false;
  error: string;
}

function wireCrudIntents(
  discovered: DiscoveredCrud,
  agent: DynamicCrudAgent,
  a: { runtime: OmegaRuntime },
  e: string,
): { updateIntent?: string; deleteIntent?: string } {
  let updateIntent: string | undefined;
  let deleteIntent: string | undefined;
  if (discovered.updateMethod) {
    updateIntent = `${e}/Update`;
    a.runtime.onIntent(updateIntent, (p: OpenApiRow) => {
      agent.applyUpdateIntent(p);
    });
  }
  if (discovered.deleteMethod || discovered.hasItemDelete) {
    deleteIntent = `${e}/Delete`;
    a.runtime.onIntent(deleteIntent, (p: OpenApiRow) => {
      agent.applyDeleteIntent(p);
    });
  }
  return { updateIntent, deleteIntent };
}

/**
 * Parses **`opts.spec`** with **`discoverFirstCrud`**; registers a **`DynamicCrudAgent`** and wiring intents **`{Entity}/List`**,
 * **`{Entity}/Create`**, plus **`{Entity}/Update`** / **`{Entity}/Delete`** when the spec exposes item routes/verbs.
 *
 * Returns **`OpenApiRegisterErr`** when discovery fails (no qualifying collection route).
 */
export function registerOpenApiCrud(opts: {
  spec: Record<string, unknown>;
  runtime: OmegaRuntime;
  http?: OmegaHttp;
  useMemoryOnApiFailure?: boolean;
}): OpenApiRegisterOk | OpenApiRegisterErr {
  const d = discoverFirstCrud(opts.spec, {});
  if ("error" in d) {
    return { ok: false, error: d.error };
  }
  return registerWithDiscovered(
    { runtime: opts.runtime, http: opts.http, useMemoryOnApiFailure: opts.useMemoryOnApiFailure },
    d,
  );
}

/**
 * Like **`registerOpenApiCrud`**, but takes a pre-built **`DiscoveredCrud`** (e.g. chosen from **`discoverAllCrud`** or filtered by path).
 */
export function registerWithDiscovered(
  a: { runtime: OmegaRuntime; http?: OmegaHttp; useMemoryOnApiFailure?: boolean },
  discovered: DiscoveredCrud,
): OpenApiRegisterOk {
  const agent = new DynamicCrudAgent(a.runtime.channel, discovered, {
    http: a.http,
    useMemoryOnApiFailure: a.useMemoryOnApiFailure,
  });
  a.runtime.registerAgent((ch: OmegaChannel) => {
    if (ch !== a.runtime.channel) {
      throw new Error("omega_openapi: unexpected OmegaChannel passed to agent factory");
    }
    return agent;
  });
  const e = discovered.entityPascal;
  a.runtime.onIntent(`${e}/List`, async () => {
    await agent.loadList();
  });
  a.runtime.onIntent(`${e}/Create`, (p: OpenApiRow) => {
    agent.applyCreateIntent(p);
  });
  const { updateIntent, deleteIntent } = wireCrudIntents(discovered, agent, a, e);
  return {
    ok: true,
    discovered,
    agent,
    listIntent: `${e}/List`,
    createIntent: `${e}/Create`,
    updateIntent,
    deleteIntent,
  };
}

export interface OpenApiMultiRegisterOk {
  ok: true;
  items: OpenApiRegisterOk[];
}

/**
 * Registers one agent + intents per collection returned by **`discoverAllCrud`** (same HTTP / memory semantics as **`registerOpenApiCrud`**).
 */
export function registerOpenApiAllCrud(
  a: { spec: Record<string, unknown>; runtime: OmegaRuntime; http?: OmegaHttp; useMemoryOnApiFailure?: boolean },
): OpenApiMultiRegisterOk | OpenApiRegisterErr {
  const { spec, ...rest } = a;
  const all = discoverAllCrud(spec, {});
  if (all.length === 0) {
    return { ok: false, error: "OpenAPI: no collection routes with GET list + POST create were found." };
  }
  const items: OpenApiRegisterOk[] = [];
  for (const discovered of all) {
    items.push(registerWithDiscovered(rest, discovered));
  }
  return { ok: true, items };
}
