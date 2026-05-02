/**
 * **`abeyjs connect`** implementation: load OpenAPI (URL or local JSON), **`buildConnectContract`**, optional TTY relabel,
 * write **`.abeyjs/connect.json`** + seed **`abeyjs.connect.yml`**.
 */

import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { buildConnectContract, type ConnectContract, type EntityType } from "./openapi-contract.js";
import { ensureYamlConfig, writeConnectContract } from "./openapi-config.js";

async function loadSpec(swaggerUrlOrPath: string, options: { insecure?: boolean }): Promise<Record<string, unknown>> {
  if (/^https?:\/\//i.test(swaggerUrlOrPath)) {
    const useInsecure = options.insecure && /^https:\/\//i.test(swaggerUrlOrPath);
    const oldTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (useInsecure) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    try {
      const r = await fetch(swaggerUrlOrPath, { credentials: "omit" });
      if (!r.ok) {
        throw new Error(`Failed to fetch OpenAPI: ${r.status} ${r.statusText}`);
      }
      return (await r.json()) as Record<string, unknown>;
    } finally {
      if (useInsecure) {
        if (oldTls == null) {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        } else {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = oldTls;
        }
      }
    }
  }
  const p = isAbsolute(swaggerUrlOrPath) ? swaggerUrlOrPath : resolve(process.cwd(), swaggerUrlOrPath);
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * @param targetDir App root that will receive **`.abeyjs/`** artifacts.
 * @param swaggerUrl Remote **http(s)** URL or filesystem path to OpenAPI JSON.
 * @param options.insecure When fetching **https**, temporarily relaxes TLS verification (dev only).
 */
export async function runConnect(
  targetDir: string,
  swaggerUrl: string,
  options: { insecure?: boolean } = {},
): Promise<{
  contractPath: string;
  yamlPath: string;
  contract: ConnectContract;
}> {
  const spec = await loadSpec(swaggerUrl, options);
  let contract = buildConnectContract(swaggerUrl, spec);
  if (contract.entities.length === 0) {
    throw new Error("No useful entities detected in the OpenAPI document.");
  }
  if (input.isTTY && output.isTTY) {
    contract = await askEntityTypes(contract);
  }
  const contractPath = await writeConnectContract(targetDir, contract);
  const yamlPath = await ensureYamlConfig(targetDir, contract);
  return { contractPath, yamlPath, contract };
}

async function askEntityTypes(contract: ConnectContract): Promise<ConnectContract> {
  const rl = createInterface({ input, output });
  const entities = [...contract.entities];
  try {
    console.log("Label each entity for generation? (crud/action/service/skip)");
    for (let i = 0; i < entities.length; i += 1) {
      const e = entities[i]!;
      const ans = (
        await rl.question(`${e.name} [${e.type}] => `)
      )
        .trim()
        .toLowerCase();
      if (ans === "" || ans === "enter") {
        continue;
      }
      if (ans === "skip" || ans === "no") {
        entities.splice(i, 1);
        i -= 1;
        continue;
      }
      if (ans === "crud" || ans === "action" || ans === "service") {
        e.type = ans as EntityType;
      }
    }
  } finally {
    rl.close();
  }
  return { ...contract, entities };
}

