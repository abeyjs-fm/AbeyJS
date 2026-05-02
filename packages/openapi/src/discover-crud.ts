/**
 * Discovers **CRUD-shaped collection** routes from an OpenAPI document and produces **`ListViewDef`** /
 * **`FormViewDef`** plus a per-row **Zod** schema.
 *
 * Distinct from handcrafted domain forms in sample apps: those use static metadata + TS document types without
 * deriving list/create from OpenAPI paths.
 */
import { derefNode } from "./refs.js";
import { guessRowKeyFromSchema, jsonObjectSchemaToZod } from "./json-schema-to-zod.js";
import type { ZodType } from "zod";
import type { FormViewDef, ListViewDef, ViewField } from "@abeyjs/view";

export interface DiscoveredCrud {
  /** p.ej. "/api/products" (colección: GET lista + POST). */
  path: string;
  entityPascal: string;
  listView: ListViewDef;
  formView: FormViewDef;
  itemZod: ZodType<Record<string, unknown>>;
  rowKey: string;
  getMethod: "get";
  postMethod: "post";
  /**
   * Ruta con un solo parámetro, p.ej. `/api/products/{id}`. Si falta, solo list+create.
   */
  itemPathTemplate?: string;
  /** Nombre del segmento, p.ej. `id` de `{id}`. */
  itemPathParamName?: string;
  /** Método para actualizar un ítem (según el spec). */
  updateMethod?: "put" | "patch" | "post" | null;
  /** Método para eliminar; por defecto `delete` cuando existe operación de borrado. */
  deleteMethod?: "delete" | "post" | null;
  /** Compat legacy: true si existe operación delete. */
  hasItemDelete?: boolean;
  /** Ruta para delete cuando difiere de itemPathTemplate. */
  deletePathTemplate?: string;
  /** Dónde viaja el identificador de fila para update/delete. */
  itemIdSource?: "path" | "query" | "body";
  /** Campo de la fila usado como identificador (fallback rowKey). */
  itemIdField?: string;
  /** dataPath opcional para listas envueltas (p.ej. payload.items). */
  listDataPath?: string;
  /** Param query para número de página (default: `page`). */
  listPageParam?: string;
  /** Param query para tamaño de página (default: `pageSize`). */
  listPageSizeParam?: string;
  /** Base de página para requests (`1` o `0`). */
  listPageBase?: 0 | 1;
  /** Path en respuesta para total de registros (p.ej. `meta.totalCount`). */
  listTotalPath?: string;
  /** Path en respuesta para página actual (p.ej. `meta.page`). */
  listPagePath?: string;
  /** Path en respuesta para tamaño de página (p.ej. `meta.limit`). */
  listPageSizePath?: string;
  /** Path en respuesta para total de páginas (p.ej. `meta.totalPages`). */
  listTotalPagesPath?: string;
}

function pathToEntityPascal(p: string): string {
  const parts = p.split("/").filter(Boolean);
  if (parts.length === 0) {
    return "Entity";
  }
  return parts
    .map((seg) => {
      const clean = seg.replaceAll(/[{}]/g, "");
      if (clean.length === 0) {
        return "X";
      }
      return clean[0]!.toUpperCase() + clean.slice(1).replaceAll("-", "");
    })
    .join("");
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function responseJsonSchemaFromGet(getOp: unknown, spec: { components?: { schemas?: Record<string, unknown> } }): { items?: unknown; array?: true } {
  const unwrapItems = (schema0: unknown): unknown | undefined => {
    const s = derefNode(spec, schema0) as {
      type?: string;
      items?: unknown;
      properties?: Record<string, unknown>;
    };
    if (s.type === "array" && s.items) {
      return s.items;
    }
    if (s.type === "object" && s.properties) {
      for (const key of ["data", "items", "results", "value"]) {
        const nested0 = s.properties[key];
        if (!nested0) {
          continue;
        }
        const nested = derefNode(spec, nested0) as { type?: string; items?: unknown } | undefined;
        if (nested?.type === "array" && nested.items) {
          return nested.items;
        }
      }
    }
    return undefined;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const o = getOp as any;
  for (const code of ["200", "201", "202", "default"]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const c = o?.responses?.[code];
    if (!c?.content) {
      continue;
    }
    const cont = c.content;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const schema = cont["application/json"]?.schema ?? cont["application/*"]?.schema ?? (Object.values(cont) as { schema?: unknown }[])[0]?.schema;
    if (schema) {
      const items = unwrapItems(schema);
      if (items) {
        return { items, array: true };
      }
    }
  }
  return {};
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function requestJsonSchemaFromPost(postOp: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const c = (postOp as any)?.requestBody?.content;
  if (!c) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return c["application/json"]?.schema ?? c["*/*"]?.schema ?? (Object.values(c) as { schema?: unknown }[])[0]?.schema;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function schemaToViewFields(
  spec: { components?: { schemas?: Record<string, unknown> } },
  itemSchema: unknown,
): { fields: ViewField[] } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const s = derefNode(spec, itemSchema) as any;
  if (!s?.properties) {
    return { fields: [] };
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const names = Object.keys(s.properties) as string[];
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    fields: names.map((k) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const t = s.properties[k] as { type?: string; format?: string; description?: string };
      const knd: "text" | "number" | "email" | "date" | "readonly" =
        k === "id"
          ? "readonly"
          : t?.type === "number" || t?.type === "integer"
            ? "number"
            : t?.format === "email"
              ? "email"
              : t?.format === "date" || t?.format === "date-time"
                ? "date"
                : "text";
      return { name: k, label: t?.description || k, kind: knd };
    }),
  };
}

type SpecShape = {
  paths?: Record<string, unknown>;
  info?: { title?: string };
  components?: { schemas?: Record<string, unknown> };
};

function findItemPathInfo(
  collectionPath: string,
  paths: Record<string, unknown>,
): { itemPathTemplate: string; paramName: string; updateMethod: "put" | "patch" | null; hasDelete: boolean } | null {
  const base = collectionPath.replace(/\/$/, "");
  for (const path of Object.keys(paths)) {
    if (!path.startsWith(base + "/")) {
      continue;
    }
    const rest = path.slice((base + "/").length);
    if (!/^\{[^/}]+\}$/.test(rest)) {
      continue;
    }
    const m = /^\{([^}]+)\}$/.exec(rest);
    if (!m) {
      continue;
    }
    const paramName = m[1] ?? "id";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = paths[path] as any;
    if (!item) {
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const hasGet = Boolean(item.get);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const hasPut = Boolean(item.put);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const hasPatch = Boolean(item.patch);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const hasDelete = Boolean(item.delete);
    let updateMethod: "put" | "patch" | null = null;
    if (hasPut) {
      updateMethod = "put";
    } else if (hasPatch) {
      updateMethod = "patch";
    }
    if (!hasGet && !updateMethod && !hasDelete) {
      continue;
    }
    return { itemPathTemplate: path, paramName, updateMethod, hasDelete };
  }
  return null;
}

/**
 * Attempts a **collection** path (no `{`/`}`) and returns **`DiscoveredCrud`** or **`null`** if the path does not qualify.
 */
function tryDiscoverCollection(
  spec: SpecShape,
  p: string,
  pathItem0: unknown,
  options: { listTitle?: string; formTitle?: string | ((entityPascal: string) => string) } = {},
): DiscoveredCrud | null {
  if (!p || p.includes("{") || p.includes("}")) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pathItem = pathItem0 as { get?: unknown; post?: unknown; put?: unknown; delete?: unknown };
  if (!pathItem.get || !pathItem.post) {
    return null;
  }
  if (!spec.paths) {
    return null;
  }
  const g = pathItem.get;
  const getRes = responseJsonSchemaFromGet(g, spec);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const postBody = requestJsonSchemaFromPost(pathItem.post);
  const getItems = getRes && "items" in getRes ? (getRes as { items?: unknown }).items : undefined;
  if (!getItems && !postBody) {
    return null;
  }
  const listItemSchema = getItems ? derefNode(spec, getItems) : postBody ? derefNode(spec, postBody) : undefined;
  const formItemSchema = postBody ? derefNode(spec, postBody) : listItemSchema;
  if (!listItemSchema || !formItemSchema) {
    return null;
  }
  const listIsObj =
    (listItemSchema as { type?: string; properties?: unknown }).type === "object" &&
    (listItemSchema as { properties?: unknown }).properties;
  const formIsObj =
    (formItemSchema as { type?: string; properties?: unknown }).type === "object" &&
    (formItemSchema as { properties?: unknown }).properties;
  if (!listIsObj || !formIsObj) {
    return null;
  }
  const zod = jsonObjectSchemaToZod(spec, formItemSchema);
  const { fields: listFields } = schemaToViewFields(spec, listItemSchema);
  const { fields: formFields } = schemaToViewFields(spec, formItemSchema);
  if (listFields.length === 0 || formFields.length === 0) {
    return null;
  }
  const rowKey = guessRowKeyFromSchema(spec, listItemSchema);
  const name = pathToEntityPascal(p);
  const apiTitle = spec.info?.title ?? "API";
  const zForForm = zod;
  const listTitle = options.listTitle ?? `${apiTitle} — ${name}`;
  const formTitle =
    options.formTitle != null
      ? typeof options.formTitle === "function"
        ? options.formTitle(name)
        : options.formTitle
      : `Crear / editar fila — ${name}`;
  const listView: ListViewDef = {
    kind: "list",
    title: listTitle,
    rowKey,
    fields: listFields,
  };
  const formView: FormViewDef = {
    kind: "form",
    title: formTitle,
    schema: zForForm,
    fields: formFields,
  };
  const item = findItemPathInfo(p, spec.paths);
  const out: DiscoveredCrud = {
    path: p,
    entityPascal: name,
    listView,
    formView,
    itemZod: zod,
    rowKey,
    getMethod: "get",
    postMethod: "post",
  };
  if (item) {
    out.itemPathTemplate = item.itemPathTemplate;
    out.itemPathParamName = item.paramName;
    out.updateMethod = item.updateMethod;
    out.deleteMethod = item.hasDelete ? "delete" : null;
    out.hasItemDelete = item.hasDelete;
    out.itemIdSource = "path";
    out.itemIdField = item.paramName;
  }
  return out;
}

/**
 * Every collection path with **GET + POST** whose list/POST JSON resolves to a coherent object item schema.
 * Order follows stable iteration of **`paths`** keys (each segment path must be free of `{` template params).
 */
export function discoverAllCrud(
  doc: Record<string, unknown>,
  options: { listTitle?: string; formTitle?: string | ((entityPascal: string) => string) } = {},
): DiscoveredCrud[] {
  const spec = doc as SpecShape;
  if (!spec.paths) {
    return [];
  }
  const out: DiscoveredCrud[] = [];
  for (const [p, pathItem0] of Object.entries(spec.paths)) {
    const d = tryDiscoverCollection(spec, p, pathItem0, options);
    if (d) {
      out.push(d);
    }
  }
  return out;
}

/**
 * The **first** qualifying collection (GET list + POST body). When a sibling **`.../{param}`** item path exists,
 * adds item metadata (PUT/PATCH/DELETE) while preserving list+create-only specs.
 */
export function discoverFirstCrud(
  doc: Record<string, unknown>,
  options: { listTitle?: string; formTitle?: string } = {},
):
  | DiscoveredCrud
  | { error: string } {
  const all = discoverAllCrud(doc, { listTitle: options.listTitle, formTitle: options.formTitle });
  if (all.length > 0) {
    return all[0]!;
  }
  return {
    error:
      "OpenAPI: no collection path with suitable GET+POST; document a 200 response with an array (or data/items/results/value) and a JSON POST request body.",
  };
}
