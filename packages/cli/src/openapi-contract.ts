/**
 * Parses an OpenAPI 3.x-ish document into a **connect contract**: named entities, inferred models,
 * CRUD-style endpoint strings, and heuristic pagination hints for `abeyjs connect` / view generation.
 *
 * Discovery rules (MVP): only **collection** paths without `{param}` segments become candidates; sibling
 * `{id}` item routes unlock update/delete metadata. Entity kind is derived from HTTP verbs on that path.
 */

type JsonSchema = {
  type?: string;
  format?: string;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  $ref?: string;
};

type OpenApiDoc = {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, JsonSchema> };
};

/** OpenAPI `type` coarse mapping; `unknown` covers missing or non-standard types. */
export type ModelFieldType =
  | "string"
  | "number"
  | "boolean"
  | "integer"
  | "array"
  | "object"
  | "unknown";

/** Single property on an entity row surfaced to the UI generator. */
export type ModelField = {
  type: ModelFieldType;
  format?: string;
  required: boolean;
  enum?: string[];
};

/** Human-readable method + path summaries for list/create/update/delete wiring. */
export type CrudEndpoints = {
  list: string;
  create: string;
  update?: string;
  delete?: string;
  itemPath?: string;
  idParam?: string;
};

/**
 * Inferred role for code generation:
 * - `crud` — collection exposes both GET and POST (typical REST list + create).
 * - `action` — POST-only style surface.
 * - `service` — everything else that still had verbs on a collection path.
 */
export type EntityType = "crud" | "action" | "service";

/**
 * One scaffoldable slice: stable name, routing base, primary key field, field model, and endpoint summary.
 * `pagination` sections are filled with best-effort guesses from query params and numeric response fields.
 */
export type EntityContract = {
  name: string;
  type: EntityType;
  routeBase: string;
  rowKey: string;
  model: Record<string, ModelField>;
  endpoints: CrudEndpoints;
  pagination?: {
    request?: {
      pageParam?: string;
      pageSizeParam?: string;
      pageBase?: 0 | 1;
    };
    response?: {
      listDataPath?: string;
      totalPath?: string;
      pagePath?: string;
      pageSizePath?: string;
      totalPagesPath?: string;
    };
  };
};

/**
 * Serialized output of `abeyjs connect`: version stamp, provenance (`swaggerUrl`, `fetchedAt`), and entities.
 */
export type ConnectContract = {
  version: 1;
  source: {
    swaggerUrl: string;
    fetchedAt: string;
  };
  entities: EntityContract[];
};

type PaginationRequestHints = NonNullable<NonNullable<EntityContract["pagination"]>["request"]>;
type PaginationResponseHints = NonNullable<NonNullable<EntityContract["pagination"]>["response"]>;

type EntityCandidate = {
  path: string;
  entityPascal: string;
  type: EntityType;
  methods: Set<"get" | "post" | "put" | "patch" | "delete">;
  rowKey: string;
  itemPathTemplate?: string;
  itemPathParamName?: string;
  updateMethod?: "put" | "patch";
  hasItemDelete?: boolean;
};

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

function guessRowKey(schema: JsonSchema | undefined): string {
  const props = Object.keys(schema?.properties ?? {});
  for (const k of ["id", "Id", "ID", "uuid", "guid", "_id"]) {
    if (props.includes(k)) {
      return k;
    }
  }
  return props[0] ?? "id";
}

function deref(doc: OpenApiDoc, schema: JsonSchema | undefined): JsonSchema | undefined {
  if (!schema) {
    return undefined;
  }
  if (!schema.$ref) {
    return schema;
  }
  const prefix = "#/components/schemas/";
  if (!schema.$ref.startsWith(prefix)) {
    return schema;
  }
  const key = schema.$ref.slice(prefix.length);
  return doc.components?.schemas?.[key];
}

function mapSchemaType(schema: JsonSchema | undefined): ModelFieldType {
  const t = schema?.type;
  if (
    t === "string" ||
    t === "number" ||
    t === "boolean" ||
    t === "integer" ||
    t === "array" ||
    t === "object"
  ) {
    return t;
  }
  return "unknown";
}

function getCollectionPathItem(doc: OpenApiDoc, collectionPath: string): {
  get?: {
    parameters?: Array<{ name?: string; in?: string; schema?: JsonSchema }>;
    responses?: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
  };
  post?: { requestBody?: { content?: Record<string, { schema?: JsonSchema }> } };
} {
  return (doc.paths?.[collectionPath] as {
    get?: {
      parameters?: Array<{ name?: string; in?: string; schema?: JsonSchema }>;
      responses?: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
    };
    post?: { requestBody?: { content?: Record<string, { schema?: JsonSchema }> } };
  }) ?? {};
}

function inferPaginationRequest(doc: OpenApiDoc, path: string): PaginationRequestHints | undefined {
  const get = getCollectionPathItem(doc, path).get;
  const params = get?.parameters ?? [];
  if (params.length === 0) {
    return undefined;
  }
  const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const isPage = (n: string): boolean => ["page", "pagenumber", "currentpage", "offset"].includes(n);
  const isPageSize = (n: string): boolean => ["pagesize", "size", "limit", "perpage", "pages"].includes(n);
  let pageParam: { name: string; schema?: JsonSchema } | undefined;
  let pageSizeParam: { name: string; schema?: JsonSchema } | undefined;
  for (const p of params) {
    if (p.in && p.in !== "query") {
      continue;
    }
    const raw = p.name?.trim();
    if (!raw) {
      continue;
    }
    const n = normalize(raw);
    if (!pageParam && isPage(n)) {
      pageParam = { name: raw, schema: p.schema };
      continue;
    }
    if (!pageSizeParam && isPageSize(n)) {
      pageSizeParam = { name: raw, schema: p.schema };
    }
  }
  if (!pageParam && !pageSizeParam) {
    return undefined;
  }
  const minimum = pageParam?.schema && typeof (pageParam.schema as JsonSchema & { minimum?: number }).minimum === "number"
    ? (pageParam.schema as JsonSchema & { minimum?: number }).minimum
    : undefined;
  return {
    pageParam: pageParam?.name,
    pageSizeParam: pageSizeParam?.name,
    pageBase: minimum === 0 ? 0 : 1,
  };
}

function inferListDataPath(doc: OpenApiDoc, path: string): string | undefined {
  const getResponses = getCollectionPathItem(doc, path).get?.responses ?? {};
  for (const code of ["200", "201", "202", "default"]) {
    const schema =
      getResponses[code]?.content?.["application/json"]?.schema ??
      getResponses[code]?.content?.["application/*"]?.schema ??
      Object.values(getResponses[code]?.content ?? {})[0]?.schema;
    const s = deref(doc, schema);
    if (!s || s.type !== "object" || !s.properties) {
      continue;
    }
    for (const key of ["data", "items", "results", "value"]) {
      const nested = deref(doc, s.properties[key]);
      if (nested?.type === "array") {
        return key;
      }
    }
  }
  return undefined;
}

function inferPaginationResponse(doc: OpenApiDoc, path: string): PaginationResponseHints | undefined {
  const getResponses = getCollectionPathItem(doc, path).get?.responses ?? {};
  for (const code of ["200", "201", "202", "default"]) {
    const schema =
      getResponses[code]?.content?.["application/json"]?.schema ??
      getResponses[code]?.content?.["application/*"]?.schema ??
      Object.values(getResponses[code]?.content ?? {})[0]?.schema;
    const s = deref(doc, schema);
    if (!s || s.type !== "object" || !s.properties) {
      continue;
    }
    const hasNum = (k: string): boolean => {
      const p = deref(doc, s.properties?.[k]);
      return p?.type === "number" || p?.type === "integer";
    };
    const pick = (candidates: string[]): string | undefined => candidates.find((k) => hasNum(k));
    const totalPath = pick(["total", "totalCount", "count"]);
    const pagePath = pick(["page", "currentPage", "pageNumber"]);
    const pageSizePath = pick(["pageSize", "size", "limit", "perPage"]);
    const totalPagesPath = pick(["totalPages"]);
    const listDataPath = inferListDataPath(doc, path);
    if (!totalPath && !pagePath && !pageSizePath && !totalPagesPath && !listDataPath) {
      return undefined;
    }
    return { listDataPath, totalPath, pagePath, pageSizePath, totalPagesPath };
  }
  return undefined;
}

function findItemPathInfo(
  collectionPath: string,
  paths: Record<string, unknown>,
): { itemPathTemplate: string; paramName: string; updateMethod?: "put" | "patch"; hasDelete: boolean } | null {
  const base = collectionPath.replace(/\/$/, "");
  for (const path of Object.keys(paths)) {
    if (!path.startsWith(base + "/")) {
      continue;
    }
    const rest = path.slice((base + "/").length);
    const m = /^\{([^}]+)\}$/.exec(rest);
    if (!m) {
      continue;
    }
    const item = (paths[path] as { put?: unknown; patch?: unknown; delete?: unknown } | undefined) ?? {};
    const updateMethod = item.put ? "put" : item.patch ? "patch" : undefined;
    const hasDelete = Boolean(item.delete);
    return {
      itemPathTemplate: path,
      paramName: m[1] ?? "id",
      updateMethod,
      hasDelete,
    };
  }
  return null;
}

function classifyEntityType(methods: Set<"get" | "post" | "put" | "patch" | "delete">): EntityType {
  if (methods.has("get") && methods.has("post")) {
    return "crud";
  }
  if (methods.has("post")) {
    return "action";
  }
  return "service";
}

function discoverEntityCandidates(doc: OpenApiDoc): EntityCandidate[] {
  const paths = doc.paths ?? {};
  const out: EntityCandidate[] = [];
  for (const [path, pathItem0] of Object.entries(paths)) {
    if (path.includes("{") || path.includes("}")) {
      continue;
    }
    const pathItem = (pathItem0 as {
      get?: unknown;
      post?: unknown;
      put?: unknown;
      patch?: unknown;
      delete?: unknown;
    } | undefined) ?? {};
    const methods = new Set<"get" | "post" | "put" | "patch" | "delete">();
    for (const m of ["get", "post", "put", "patch", "delete"] as const) {
      if (pathItem[m]) {
        methods.add(m);
      }
    }
    if (methods.size === 0) {
      continue;
    }
    const itemSchema = pickItemSchema(doc, { path });
    const rowKey = guessRowKey(itemSchema);
    const itemInfo = findItemPathInfo(path, paths);
    out.push({
      path,
      entityPascal: pathToEntityPascal(path),
      type: classifyEntityType(methods),
      methods,
      rowKey,
      itemPathTemplate: itemInfo?.itemPathTemplate,
      itemPathParamName: itemInfo?.paramName,
      updateMethod: itemInfo?.updateMethod,
      hasItemDelete: itemInfo?.hasDelete,
    });
  }
  return out;
}

function pickItemSchema(doc: OpenApiDoc, crud: { path: string }): JsonSchema | undefined {
  const pathItem = getCollectionPathItem(doc, crud.path);
  const getResponses = pathItem.get?.responses ?? {};
  const unwrapResponseItem = (schema: JsonSchema | undefined): JsonSchema | undefined => {
    const s = deref(doc, schema);
    if (!s) {
      return undefined;
    }
    const items = deref(doc, s.items);
    if (s.type === "array" && items?.type === "object") {
      return items;
    }
    if (s.type === "object") {
      const candidates = [s.properties?.data, s.properties?.items, s.properties?.results, s.properties?.value];
      for (const c of candidates) {
        const inner = deref(doc, c);
        if (!inner) {
          continue;
        }
        const innerItems = deref(doc, inner.items);
        if (inner.type === "array" && innerItems?.type === "object") {
          return innerItems;
        }
        if (inner.type === "object" && inner.properties) {
          return inner;
        }
      }
    }
    return undefined;
  };
  for (const code of ["200", "201", "202", "default"]) {
    const schema =
      getResponses[code]?.content?.["application/json"]?.schema ??
      getResponses[code]?.content?.["application/*"]?.schema ??
      Object.values(getResponses[code]?.content ?? {})[0]?.schema;
    const fromGet = unwrapResponseItem(schema);
    if (fromGet?.type === "object") {
      return fromGet;
    }
  }
  const postSchema =
    pathItem.post?.requestBody?.content?.["application/json"]?.schema ??
    pathItem.post?.requestBody?.content?.["application/*"]?.schema ??
    Object.values(pathItem.post?.requestBody?.content ?? {})[0]?.schema;
  const resolvedPost = deref(doc, postSchema);
  if (resolvedPost?.type === "object") {
    return resolvedPost;
  }
  return undefined;
}

function pickPostSchema(doc: OpenApiDoc, crud: { path: string }): JsonSchema | undefined {
  const pathItem = getCollectionPathItem(doc, crud.path);
  const postSchema =
    pathItem.post?.requestBody?.content?.["application/json"]?.schema ??
    pathItem.post?.requestBody?.content?.["application/*"]?.schema ??
    Object.values(pathItem.post?.requestBody?.content ?? {})[0]?.schema;
  const resolvedPost = deref(doc, postSchema);
  return resolvedPost?.type === "object" ? resolvedPost : undefined;
}

function mergeObjectSchemas(base: JsonSchema | undefined, extra: JsonSchema | undefined): JsonSchema | undefined {
  if (!base && !extra) {
    return undefined;
  }
  const baseProps = base?.properties ?? {};
  const extraProps = extra?.properties ?? {};
  const mergedProps: Record<string, JsonSchema> = { ...baseProps, ...extraProps };
  const req = new Set<string>([...(base?.required ?? []), ...(extra?.required ?? [])]);
  return {
    type: "object",
    properties: mergedProps,
    required: Array.from(req),
  };
}

function toModel(schema: JsonSchema | undefined): Record<string, ModelField> {
  const resolved = schema;
  const props = resolved?.properties ?? {};
  const required = new Set(resolved?.required ?? []);
  const out: Record<string, ModelField> = {};
  for (const [name, raw] of Object.entries(props)) {
    const t = mapSchemaType(raw);
    out[name] = {
      type: t,
      format: raw.format,
      required: required.has(name),
      enum: Array.isArray(raw.enum) ? raw.enum.map((v) => String(v)) : undefined,
    };
  }
  return out;
}

function toEndpoints(e: EntityCandidate): CrudEndpoints {
  return {
    list: `GET ${e.path}`,
    create: `POST ${e.path}`,
    update: e.updateMethod && e.itemPathTemplate ? `${e.updateMethod.toUpperCase()} ${e.itemPathTemplate}` : undefined,
    delete: e.hasItemDelete && e.itemPathTemplate ? `DELETE ${e.itemPathTemplate}` : undefined,
    itemPath: e.itemPathTemplate,
    idParam: e.itemPathParamName,
  };
}

/**
 * Walks `paths` in the parsed OpenAPI JSON, derives {@link EntityContract} rows, merges GET-list and POST-create
 * object schemas into one field map, and attaches pagination hints when query/response shapes look paginated.
 *
 * @param swaggerUrl Original URL or path string stored for audit (`ConnectContract.source`).
 * @param spec Raw OpenAPI document (typically `{ paths, components }`).
 */
export function buildConnectContract(swaggerUrl: string, spec: Record<string, unknown>): ConnectContract {
  const doc = spec as OpenApiDoc;
  const discovered = discoverEntityCandidates(doc);
  const entities: EntityContract[] = discovered.map((entity) => {
    const listSchema = pickItemSchema(doc, entity);
    const postSchema = pickPostSchema(doc, entity);
    const itemSchema = mergeObjectSchemas(listSchema, postSchema);
    return {
      name: entity.entityPascal,
      type: entity.type,
      routeBase: entity.path,
      rowKey: entity.rowKey,
      model: toModel(itemSchema),
      endpoints: toEndpoints(entity),
      pagination: {
        request: inferPaginationRequest(doc, entity.path),
        response: inferPaginationResponse(doc, entity.path),
      },
    };
  });
  return {
    version: 1,
    source: {
      swaggerUrl,
      fetchedAt: new Date().toISOString(),
    },
    entities,
  };
}

