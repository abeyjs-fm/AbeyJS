/**
 * Persists **`ConnectContract`** to **`.abeyjs/connect.json`** and maintains **`abeyjs.connect.yml`** — human tuning for
 * **`abeyjs generate views`** (widgets, select endpoints, pagination overrides, per-entity UI flags).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import type { ConnectContract, EntityContract, EntityType, ModelFieldType } from "./openapi-contract.js";

export type WidgetKind = "text" | "number" | "email" | "date" | "readonly" | "checkbox" | "select";

export type FieldUiConfig = {
  source?: string;
  label?: string;
  dataType?: ModelFieldType;
  widget?: WidgetKind;
  options?: {
    endpoint: string;
    valueField: string;
    labelField: string;
    dependsOn?: string;
    dataPath?: string;
  };
};

export type EntityUiConfig = {
  type?: EntityType;
  sourceEntity?: string;
  endpointPath?: string;
  menuLabel?: string;
  route?: string;
  showToolbar?: boolean;
  showTrace?: boolean;
  showFlowMessage?: boolean;
  response?: {
    listDataPath?: string;
    totalPath?: string;
    pagePath?: string;
    pageSizePath?: string;
    totalPagesPath?: string;
  };
  request?: {
    pageParam?: string;
    pageSizeParam?: string;
    pageBase?: 0 | 1;
  };
  operations?: {
    update?: {
      method?: "put" | "patch" | "post";
      path?: string;
      idSource?: "path" | "query" | "body";
      idField?: string;
      idParam?: string;
    };
    delete?: {
      method?: "delete" | "post";
      path?: string;
      idSource?: "path" | "query" | "body";
      idField?: string;
      idParam?: string;
    };
  };
  fields?: Record<string, FieldUiConfig>;
};

export type ConnectYamlConfig = {
  app?: {
    openApiUrl?: string;
    apiBaseUrl?: string;
    refreshTokenEndpoint?: string;
    showToolbar?: boolean;
    showTrace?: boolean;
    showFlowMessage?: boolean;
  };
  entities?: Record<string, EntityUiConfig>;
};

function defaultWidgetForType(t: ModelFieldType, format?: string): WidgetKind {
  if (format === "email") {
    return "email";
  }
  if (format === "date" || format === "date-time") {
    return "date";
  }
  if (t === "number" || t === "integer") {
    return "number";
  }
  if (t === "boolean") {
    return "checkbox";
  }
  return "text";
}

function singularizeName(s: string): string {
  if (s.endsWith("ies")) {
    return `${s.slice(0, -3)}y`;
  }
  if (s.endsWith("s")) {
    return s.slice(0, -1);
  }
  return s;
}

function chooseLabelField(entity: EntityContract): string {
  for (const k of ["name", "title", "description", "label"]) {
    if (k in entity.model) {
      return k;
    }
  }
  return entity.rowKey;
}

function inferSelectOptions(
  contract: ConnectContract,
  currentEntity: EntityContract,
  fieldName: string,
): FieldUiConfig["options"] | undefined {
  if (!/id$/i.test(fieldName) || fieldName === currentEntity.rowKey) {
    return undefined;
  }
  const base = singularizeName(fieldName.replace(/id$/i, "").toLowerCase());
  if (!base) {
    return undefined;
  }
  const target = contract.entities.find((e) => {
    if (e.name === currentEntity.name) {
      return false;
    }
    const routeTail = singularizeName(e.routeBase.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "");
    const nameNorm = singularizeName(e.name.replace(/^api/i, "").toLowerCase());
    return routeTail === base || nameNorm.endsWith(base);
  });
  if (!target) {
    return undefined;
  }
  return {
    endpoint: target.routeBase,
    valueField: target.rowKey,
    labelField: chooseLabelField(target),
  };
}

export function buildDefaultYamlConfig(contract: ConnectContract): ConnectYamlConfig {
  const entities: Record<string, EntityUiConfig> = {};
  const isPrimaryTechnicalId = (fieldName: string, rowKey: string): boolean => {
    if (fieldName !== rowKey) {
      return false;
    }
    return /^(id|uuid|guid|_id)$/i.test(fieldName);
  };
  for (const entity of contract.entities) {
    const fields: Record<string, FieldUiConfig> = {};
    for (const [name, meta] of Object.entries(entity.model)) {
      // Hide only the technical PK of the same entity.
      // FKs como authorId deben permanecer visibles/configurables.
      if (isPrimaryTechnicalId(name, entity.rowKey)) {
        continue;
      }
      const inferredSelect = inferSelectOptions(contract, entity, name);
      if (inferredSelect) {
        fields[name] = { widget: "select", options: inferredSelect };
        continue;
      }
      fields[name] = { widget: defaultWidgetForType(meta.type, meta.format) };
    }
    entities[entity.name] = {
      type: entity.type,
      menuLabel: entity.name,
      route: `/crud/${entity.name.toLowerCase()}`,
      request:
        entity.pagination?.request?.pageParam || entity.pagination?.request?.pageSizeParam
          ? {
              pageParam: entity.pagination?.request?.pageParam,
              pageSizeParam: entity.pagination?.request?.pageSizeParam,
              pageBase: entity.pagination?.request?.pageBase,
            }
          : undefined,
      response:
        entity.pagination?.response?.listDataPath ||
        entity.pagination?.response?.totalPath ||
        entity.pagination?.response?.pagePath ||
        entity.pagination?.response?.pageSizePath ||
        entity.pagination?.response?.totalPagesPath
          ? {
              listDataPath: entity.pagination?.response?.listDataPath,
              totalPath: entity.pagination?.response?.totalPath,
              pagePath: entity.pagination?.response?.pagePath,
              pageSizePath: entity.pagination?.response?.pageSizePath,
              totalPagesPath: entity.pagination?.response?.totalPagesPath,
            }
          : undefined,
      fields,
    };
  }
  return {
    app: {
      openApiUrl: contract.source.swaggerUrl,
      apiBaseUrl: "",
    },
    entities,
  };
}

export function validateYamlConfig(contract: ConnectContract, config: ConnectYamlConfig): string[] {
  const errors: string[] = [];
  const allowedDataTypes = new Set<ModelFieldType>([
    "string",
    "number",
    "boolean",
    "integer",
    "array",
    "object",
    "unknown",
  ]);
  const entityMap = new Map(contract.entities.map((e) => [e.name, e]));
  for (const [entityName, entityCfg] of Object.entries(config.entities ?? {})) {
    const entity = entityMap.get(entityName);
    if (!entity) {
      errors.push(`Entidad no detectada en connect.json: ${entityName}`);
      continue;
    }
    if (entityCfg.type && !["crud", "action", "service"].includes(entityCfg.type)) {
      errors.push(`Invalid ${entityName}.type: ${entityCfg.type}`);
    }
    if (entityCfg.sourceEntity && !entityMap.has(entityCfg.sourceEntity)) {
      errors.push(`Invalid ${entityName}.sourceEntity: ${entityCfg.sourceEntity}`);
    }
    if (entityCfg.operations?.update?.method && !["put", "patch", "post"].includes(entityCfg.operations.update.method)) {
      errors.push(`Invalid ${entityName}.operations.update.method: ${entityCfg.operations.update.method}`);
    }
    if (entityCfg.operations?.delete?.method && !["delete", "post"].includes(entityCfg.operations.delete.method)) {
      errors.push(`Invalid ${entityName}.operations.delete.method: ${entityCfg.operations.delete.method}`);
    }
    if (entityCfg.operations?.update?.idSource && !["path", "query", "body"].includes(entityCfg.operations.update.idSource)) {
      errors.push(`Invalid ${entityName}.operations.update.idSource: ${entityCfg.operations.update.idSource}`);
    }
    if (entityCfg.operations?.delete?.idSource && !["path", "query", "body"].includes(entityCfg.operations.delete.idSource)) {
      errors.push(`Invalid ${entityName}.operations.delete.idSource: ${entityCfg.operations.delete.idSource}`);
    }
    if (entityCfg.request?.pageBase != null && ![0, 1].includes(entityCfg.request.pageBase)) {
      errors.push(`Invalid ${entityName}.request.pageBase: ${String(entityCfg.request.pageBase)} (use 0 or 1)`);
    }
    for (const [fieldName, fieldCfg] of Object.entries(entityCfg.fields ?? {})) {
      if (!(fieldName in entity.model)) {
        errors.push(`Campo no detectado: ${entityName}.${fieldName}`);
        continue;
      }
      if (fieldCfg.dataType && !allowedDataTypes.has(fieldCfg.dataType)) {
        errors.push(`Invalid ${entityName}.${fieldName}.dataType: ${fieldCfg.dataType}`);
      }
      if (fieldCfg.source && !(fieldCfg.source in entity.model)) {
        errors.push(`Invalid ${entityName}.${fieldName}.source: ${fieldCfg.source}`);
      }
      if (fieldCfg.widget === "select") {
        const opt = fieldCfg.options;
        if (!opt?.endpoint || !opt.valueField || !opt.labelField) {
          errors.push(
            `Config select incompleta en ${entityName}.${fieldName}: requiere options.endpoint, valueField, labelField`,
          );
        }
      }
    }
  }
  return errors;
}

export async function ensureYamlConfig(targetDir: string, contract: ConnectContract): Promise<string> {
  const root = resolve(targetDir);
  const configPath = join(root, "abeyjs.connect.yml");
  const present = await readFile(configPath, "utf-8").catch(() => "");
  if (present.trim() !== "") {
    return configPath;
  }
  const initial = buildDefaultYamlConfig(contract);
  const header = [
    "# AbeyJs connect config",
    "# app.openApiUrl y app.apiBaseUrl permiten cambiar URLs por ambiente/productivo",
    "# app.refreshTokenEndpoint permite definir ruta de refresh token manual (opcional)",
    "# app.showTrace / app.showFlowMessage: false por defecto (activar solo si necesitas debug)",
    "# operations.update/delete permiten APIs no convencionales (method/path/idSource/idField/idParam)",
    "# response.listDataPath soporta respuestas envueltas: data, items, payload.rows, etc.",
    "# Pagination overrides per entity:",
    "# request.pageParam/pageSizeParam/pageBase(0|1) y response.totalPath/pagePath/pageSizePath/totalPagesPath",
    "# widget: text|number|email|date|readonly|checkbox|select",
    "# fields.<name>.source / .label / .dataType permiten adaptar cambios de esquema",
    "# entities.<name>.endpointPath permite mapear path distinto del detectado",
    "# Para select: options.endpoint + valueField + labelField",
    "",
  ].join("\n");
  await writeFile(configPath, header + stringify(initial), "utf-8");
  return configPath;
}

export async function readYamlConfig(targetDir: string): Promise<ConnectYamlConfig> {
  const root = resolve(targetDir);
  const configPath = join(root, "abeyjs.connect.yml");
  const raw = await readFile(configPath, "utf-8");
  const data = parse(raw) as ConnectYamlConfig | null;
  return data ?? {};
}

export async function writeConnectContract(targetDir: string, contract: ConnectContract): Promise<string> {
  const root = resolve(targetDir);
  const outDir = join(root, ".abeyjs");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "connect.json");
  await writeFile(outPath, JSON.stringify(contract, null, 2) + "\n", "utf-8");
  return outPath;
}

export async function readConnectContract(targetDir: string): Promise<ConnectContract> {
  const root = resolve(targetDir);
  const p = join(root, ".abeyjs", "connect.json");
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as ConnectContract;
}

export function resolveEntityConfig(entity: EntityContract, config: ConnectYamlConfig): EntityUiConfig {
  return config.entities?.[entity.name] ?? {};
}

