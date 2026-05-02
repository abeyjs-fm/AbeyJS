import { OmegaAgentBehaviorEngine, OmegaStatefulAgent } from "@abeyjs/agents";
import type { OmegaChannel } from "@abeyjs/core";
import { mergeListRowsByKey } from "./list-merge.js";
import type { OmegaHttp } from "@abeyjs/http";
import { mapJsonToFieldSelectItems } from "@abeyjs/uikit";
import type { ZodType } from "zod";
import type { DiscoveredCrud } from "./discover-crud.js";

/**
 * **`DynamicCrudAgent`** wires **`OmegaStatefulAgent`** to **`OmegaHttp`** (optional) using a **`DiscoveredCrud`**:
 * list paging, optimistic memory fallback (`useMemoryOnApiFailure`), form validation via Zod, and optional select lookups.
 */

export type OpenApiRow = Record<string, unknown>;

export interface DynamicCrudViewState {
  list: {
    rows: OpenApiRow[];
    status: "loading" | "ready" | "error";
    errorMessage?: string;
    total?: number;
    page?: number;
    pageSize?: number;
    serverPaging?: boolean;
  };
  form: {
    value: OpenApiRow;
    status: "idle" | "saving" | "error" | "success";
    errorMessage?: string;
    fieldErrors?: Record<string, string>;
    mode: "create" | "edit";
  };
  flowMessage: string;
}

function toView(s: unknown): DynamicCrudViewState {
  if (s && typeof s === "object" && "list" in s && "form" in s) {
    const t = s as DynamicCrudViewState;
    const form = t.form;
    if (form.mode == null) {
      return { ...t, form: { ...form, mode: "create" } };
    }
    return t;
  }
  return {
    list: { rows: [], status: "ready" },
    form: { value: {}, status: "idle", mode: "create" },
    flowMessage: "",
  };
}

function normalizeListPayload(payload: unknown): OpenApiRow[] {
  if (Array.isArray(payload)) {
    return payload as OpenApiRow[];
  }
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    const nested = [root.data, root.items, root.results, root.value];
    for (const candidate of nested) {
      if (Array.isArray(candidate)) {
        return candidate as OpenApiRow[];
      }
    }
  }
  throw new Error('List response is not an array (expected root array or envelope key "data" | "items" | "results" | "value").');
}

function numberAtPath(payload: unknown, path: string): number | undefined {
  const v = valueAtPath(payload, path);
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

function firstNumberAtPaths(payload: unknown, paths: string[]): number | undefined {
  for (const p of paths) {
    const n = numberAtPath(payload, p);
    if (n != null) {
      return n;
    }
  }
  return undefined;
}

function parseListEnvelope(
  payload: unknown,
  hints?: {
    totalPath?: string;
    pagePath?: string;
    pageSizePath?: string;
    totalPagesPath?: string;
  },
): {
  rows: OpenApiRow[];
  total?: number;
  page?: number;
  pageSize?: number;
  serverPaging: boolean;
} {
  if (Array.isArray(payload)) {
    return { rows: payload as OpenApiRow[], serverPaging: false };
  }
  if (payload && typeof payload === "object") {
    const rows = normalizeListPayload(payload);
    const total = firstNumberAtPaths(payload, [
      ...(hints?.totalPath ? [hints.totalPath] : []),
      "total",
      "totalCount",
      "count",
      "meta.total",
      "meta.totalCount",
      "pagination.total",
      "pageInfo.total",
      "data.total",
      "data.totalCount",
    ]);
    const page = firstNumberAtPaths(payload, [
      ...(hints?.pagePath ? [hints.pagePath] : []),
      "page",
      "currentPage",
      "pageNumber",
      "meta.page",
      "meta.currentPage",
      "pagination.page",
      "pageInfo.page",
      "data.page",
    ]);
    const pageSize = firstNumberAtPaths(payload, [
      ...(hints?.pageSizePath ? [hints.pageSizePath] : []),
      "pageSize",
      "size",
      "limit",
      "perPage",
      "meta.pageSize",
      "meta.size",
      "meta.limit",
      "pagination.pageSize",
      "pagination.limit",
      "pageInfo.pageSize",
      "data.pageSize",
    ]);
    const totalPages = firstNumberAtPaths(payload, [
      ...(hints?.totalPagesPath ? [hints.totalPagesPath] : []),
      "totalPages",
      "meta.totalPages",
      "pagination.totalPages",
      "pageInfo.totalPages",
      "data.totalPages",
    ]);
    const resolvedTotal = total ?? (totalPages != null && pageSize != null ? totalPages * pageSize : undefined);
    const serverPaging = resolvedTotal != null || totalPages != null;
    return { rows, total: resolvedTotal, page, pageSize, serverPaging };
  }
  return { rows: normalizeListPayload(payload), serverPaging: false };
}

function valueAtPath(payload: unknown, path: string): unknown {
  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  let cur: unknown = payload;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in (cur as Record<string, unknown>))) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * Stateful agent bound to **one Swagger collection**: **Zod**-backed validation, optional **OmegaHttp**, in-memory row store
 * when APIs fail, and item operations when the spec exposes **`.../{param}`** with PUT/PATCH/DELETE.
 */
export class DynamicCrudAgent extends OmegaStatefulAgent<DynamicCrudViewState> {
  private static byPath: Map<string, OpenApiRow[]> = new Map();
  private static lookupCache: Map<string, Array<{ value: string; label: string }>> = new Map();

  private readonly discovered: DiscoveredCrud;
  private readonly http?: OmegaHttp;
  private readonly useMemoryOnApiFailure: boolean;
  private readonly itemZod: ZodType<Record<string, unknown>>;

  constructor(
    ch: OmegaChannel,
    discovered: DiscoveredCrud,
    options: { http?: OmegaHttp; useMemoryOnApiFailure?: boolean } = {},
  ) {
    const selfId = `openApi:${discovered.path}`;
    const emptyForm = DynamicCrudAgent.buildDefaultForm(discovered);
    super(
      { channel: ch, selfId, behavior: new OmegaAgentBehaviorEngine() },
      {
        list: { rows: [], status: "ready", page: 1, pageSize: 10, serverPaging: false },
        form: { value: emptyForm, status: "idle", mode: "create" },
        flowMessage: "",
      },
    );
    this.discovered = discovered;
    this.http = options.http;
    this.useMemoryOnApiFailure = options.useMemoryOnApiFailure ?? true;
    this.itemZod = discovered.itemZod;
  }

  private static buildDefaultForm(d: DiscoveredCrud): OpenApiRow {
    const o: OpenApiRow = {};
    for (const f of d.formView.fields) {
      o[f.name] = f.kind === "number" ? 0 : "";
    }
    return o;
  }

  private setVs(s: DynamicCrudViewState): void {
    this.setViewState(s);
  }

  private defaultForm(): OpenApiRow {
    return DynamicCrudAgent.buildDefaultForm(this.discovered);
  }

  private storeKey(): string {
    return this.discovered.path;
  }

  get rows(): OpenApiRow[] {
    return DynamicCrudAgent.byPath.get(this.storeKey()) ?? [];
  }

  private setRows(r: OpenApiRow[]): void {
    DynamicCrudAgent.byPath.set(this.storeKey(), r);
  }

  private invalidateLookupCaches(): void {
    DynamicCrudAgent.lookupCache.clear();
  }

  /** Switches the form to **edit** mode with the given row snapshot. */
  beginEdit(row: OpenApiRow): void {
    this.setVs({
      ...toView(this.viewState.get()),
      form: { value: { ...row }, status: "idle", mode: "edit" },
      flowMessage: "Modo edición: Guardar en enviar.",
    });
  }

  /** Resets the form to **create** mode with defaults. */
  cancelEdit(): void {
    this.setVs({
      ...toView(this.viewState.get()),
      form: { value: this.defaultForm(), status: "idle", mode: "create" },
      flowMessage: "Formulario: nuevo",
    });
  }

  private resolveIdValue(row: OpenApiRow): string | number {
    const idField = this.discovered.itemIdField ?? this.discovered.itemPathParamName ?? this.discovered.rowKey;
    const v = (row[idField] ?? row[this.discovered.rowKey]) as string | number | null | undefined;
    if (v == null) {
      throw new Error(`openApi: row is missing identifier field "${String(idField)}" for item operation.`);
    }
    return v;
  }

  private resolveOperationPath(row: OpenApiRow, template: string | undefined): string {
    const tpl = template ?? this.discovered.itemPathTemplate ?? this.discovered.path;
    const idSource = this.discovered.itemIdSource ?? "path";
    const idParam = this.discovered.itemPathParamName ?? "id";
    const idValue = this.resolveIdValue(row);
    if (idSource === "body") {
      return tpl;
    }
    if (idSource === "query") {
      const sep = tpl.includes("?") ? "&" : "?";
      return `${tpl}${sep}${encodeURIComponent(idParam)}=${encodeURIComponent(String(idValue))}`;
    }
    return tpl.replace(`{${idParam}}`, encodeURIComponent(String(idValue)));
  }

  private payloadWithBodyId(row: OpenApiRow): OpenApiRow {
    const idSource = this.discovered.itemIdSource ?? "path";
    if (idSource !== "body") {
      return row;
    }
    const idField = this.discovered.itemIdField ?? this.discovered.itemPathParamName ?? this.discovered.rowKey;
    if (row[idField] != null) {
      return row;
    }
    return { ...row, [idField]: this.resolveIdValue(row) };
  }

  connect(): void {
    this.setVs({ ...toView(this.viewState.get()), list: { ...toView(this.viewState.get()).list, rows: this.rows } });
  }

  async loadList(): Promise<void> {
    const current = toView(this.viewState.get()).list;
    const page = current.page ?? 1;
    const pageSize = current.pageSize ?? 10;
    this.setVs({ ...toView(this.viewState.get()), list: { ...current, rows: [], status: "loading" } });
    if (this.http) {
      try {
        const pageParam = this.discovered.listPageParam?.trim() || "page";
        const pageSizeParam = this.discovered.listPageSizeParam?.trim() || "pageSize";
        const pageBase = this.discovered.listPageBase ?? 1;
        const apiPage = pageBase === 0 ? Math.max(0, page - 1) : page;
        let incoming: unknown;
        const sep = this.discovered.path.includes("?") ? "&" : "?";
        const candidatePairs: Array<{ p: string; s: string }> = [];
        const pushPair = (p: string, s: string): void => {
          if (!candidatePairs.some((it) => it.p === p && it.s === s)) {
            candidatePairs.push({ p, s });
          }
        };
        pushPair(pageParam, pageSizeParam);
        pushPair("page", "pageSize");
        pushPair("Page", "PageSize");
        pushPair("pageNumber", "pageSize");
        pushPair("offset", "limit");
        const candidateUrls = candidatePairs.map(
          (pair) =>
            `${this.discovered.path}${sep}${encodeURIComponent(pair.p)}=${encodeURIComponent(String(apiPage))}&${encodeURIComponent(pair.s)}=${encodeURIComponent(String(pageSize))}`,
        );
        candidateUrls.push(this.discovered.path);
        let lastErr: unknown;
        for (const url of candidateUrls) {
          try {
            incoming = await this.http.getJson<unknown>(url);
            lastErr = undefined;
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (incoming == null && lastErr != null) {
          throw lastErr;
        }
        const maybeNested = this.discovered.listDataPath ? valueAtPath(incoming, this.discovered.listDataPath) : incoming;
        const parsed = parseListEnvelope(
          this.discovered.listDataPath && incoming && typeof incoming === "object"
            ? {
                ...(incoming as Record<string, unknown>),
                data: maybeNested,
              }
            : maybeNested,
          {
            totalPath: this.discovered.listTotalPath,
            pagePath: this.discovered.listPagePath,
            pageSizePath: this.discovered.listPageSizePath,
            totalPagesPath: this.discovered.listTotalPagesPath,
          },
        );
        const data = parsed.rows;
        const key = this.discovered.rowKey;
        const prev = toView(this.viewState.get()).list.rows;
        const merged = parsed.serverPaging ? data : mergeListRowsByKey<OpenApiRow>(prev, data, key);
        this.setRows(merged);
        this.setVs({
          ...toView(this.viewState.get()),
          list: {
            rows: merged,
            status: "ready",
            total: parsed.total ?? merged.length,
            page: parsed.page != null ? (pageBase === 0 ? parsed.page + 1 : parsed.page) : page,
            pageSize: parsed.pageSize ?? pageSize,
            serverPaging: parsed.serverPaging,
          },
          flowMessage: "GET " + this.discovered.path + " OK (swagger)",
        });
        return;
      } catch (e) {
        const err = (e as Error).message;
        if (this.useMemoryOnApiFailure) {
          await new Promise((r) => setTimeout(r, 40));
          this.setVs({
            ...toView(this.viewState.get()),
            list: { rows: this.rows, status: "ready" },
            flowMessage: "API no alcanzable: memoria. " + err.slice(0, 100),
          });
          return;
        }
        this.setVs({ ...toView(this.viewState.get()), list: { rows: [], status: "error", errorMessage: err } });
        return;
      }
    }
    this.setVs({ ...toView(this.viewState.get()), list: { rows: this.rows, status: "ready" } });
  }

  async loadListPage(page: number, pageSize?: number): Promise<void> {
    const current = toView(this.viewState.get()).list;
    this.setVs({
      ...toView(this.viewState.get()),
      list: { ...current, page: Math.max(1, page), pageSize: pageSize ?? current.pageSize ?? 10 },
    });
    await this.loadList();
  }

  applyCreateIntent(payload: OpenApiRow): void {
    const f = toView(this.viewState.get()).form;
    if (f.mode === "edit" && this.discovered.updateMethod) {
      this.runUpdate(payload);
      return;
    }
    this.runCreate(payload);
  }

  private runCreate(payload: OpenApiRow): void {
    const p = this.itemZod.safeParse(payload);
    if (!p.success) {
      this.setVs({
        ...toView(this.viewState.get()),
        form: {
          ...toView(this.viewState.get()).form,
          status: "error",
          fieldErrors: zodErrorToMap(p.error),
        },
      });
      return;
    }
    this.setVs({ ...toView(this.viewState.get()), form: { ...toView(this.viewState.get()).form, status: "saving" } });
    const row = p.data;
    if (this.http) {
      void (async () => {
        const h = this.http;
        try {
          if (h) {
            await h.postJson<unknown>(this.discovered.path, row);
          }
        } catch {
          /* se refuerza en memoria */
        }
        this.pushAndRefresh(row);
      })();
    } else {
      this.pushAndRefresh(row);
    }
  }

  /** Misma validación y cuerpo que un POST; hace PUT o PATCH a la ruta de ítem. */
  applyUpdateIntent(payload: OpenApiRow): void {
    this.runUpdate(payload);
  }

  private runUpdate(payload: OpenApiRow): void {
    if (!this.discovered.updateMethod) {
      this.setVs({
        ...toView(this.viewState.get()),
        form: { ...toView(this.viewState.get()).form, status: "error", errorMessage: "No hay operación de actualización en el spec." },
      });
      return;
    }
    const p = this.itemZod.safeParse(payload);
    if (!p.success) {
      this.setVs({
        ...toView(this.viewState.get()),
        form: {
          ...toView(this.viewState.get()).form,
          status: "error",
          fieldErrors: zodErrorToMap(p.error),
        },
      });
      return;
    }
    this.setVs({ ...toView(this.viewState.get()), form: { ...toView(this.viewState.get()).form, status: "saving" } });
    const row = this.payloadWithBodyId(p.data);
    const m = this.discovered.updateMethod;
    if (this.http) {
      const h = this.http;
      const u = this.resolveOperationPath(row, this.discovered.itemPathTemplate);
      void (async () => {
        try {
          if (m === "put") {
            await h.putJson<unknown>(u, row);
          } else if (m === "post") {
            await h.postJson<unknown>(u, row);
          } else {
            await h.patchJson<unknown>(u, row);
          }
        } catch (e) {
          const msg = (e as Error).message;
          if (this.useMemoryOnApiFailure) {
            this.mergeRowLocal(row);
            this.setVs({
              ...toView(this.viewState.get()),
              form: { value: this.defaultForm(), status: "success", mode: "create" },
              flowMessage: "PUT/PATCH: error API; aplicado en memoria. " + msg.slice(0, 80),
            });
            this.invalidateLookupCaches();
            return;
          }
          this.setVs({
            ...toView(this.viewState.get()),
            form: { ...toView(this.viewState.get()).form, status: "error", errorMessage: msg },
          });
          return;
        }
        this.mergeRowLocal(row);
        this.setVs({
          ...toView(this.viewState.get()),
          form: { value: this.defaultForm(), status: "success", mode: "create" },
          flowMessage: m.toUpperCase() + " " + u + " OK",
        });
        this.invalidateLookupCaches();
      })();
    } else {
      this.mergeRowLocal(row);
      this.setVs({
        ...toView(this.viewState.get()),
        form: { value: this.defaultForm(), status: "success", mode: "create" },
        flowMessage: "Actualizado en memoria (sin HTTP).",
      });
      this.invalidateLookupCaches();
    }
  }

  applyDeleteIntent(row: OpenApiRow): void {
    if (!this.discovered.deleteMethod && !this.discovered.hasItemDelete) {
      this.setVs({ ...toView(this.viewState.get()), flowMessage: "DELETE no definido en el spec." });
      return;
    }
    const p = this.itemZod.safeParse(row);
    if (!p.success) {
      return;
    }
    const key = this.discovered.rowKey;
    if (this.http) {
      const h = this.http;
      const payload = this.payloadWithBodyId(p.data);
      const u = this.resolveOperationPath(p.data, this.discovered.deletePathTemplate ?? this.discovered.itemPathTemplate);
      const deleteMethod = this.discovered.deleteMethod ?? (this.discovered.hasItemDelete ? "delete" : null);
      void (async () => {
        try {
          if (deleteMethod === "post") {
            await h.postJson<unknown>(u, payload);
          } else {
            await h.deletePath(u);
          }
        } catch (e) {
          const msg = (e as Error).message;
          if (this.useMemoryOnApiFailure) {
            this.removeRowByKey(p.data, key);
            this.setVs({ ...toView(this.viewState.get()), flowMessage: "DELETE error API; fila retirada en memoria. " + msg.slice(0, 60) });
            this.invalidateLookupCaches();
            return;
          }
          this.setVs({ ...toView(this.viewState.get()), flowMessage: "DELETE: " + msg });
          return;
        }
        try {
          await this.loadList();
          this.setVs({
            ...toView(this.viewState.get()),
            form: { value: this.defaultForm(), status: "idle", mode: "create" },
            flowMessage: "DELETE " + u + " OK",
          });
          this.invalidateLookupCaches();
        } catch {
          this.removeRowByKey(p.data, key);
          this.setVs({
            ...toView(this.viewState.get()),
            form: { value: this.defaultForm(), status: "idle", mode: "create" },
            flowMessage: "DELETE " + u + " OK (refresco local).",
          });
          this.invalidateLookupCaches();
        }
      })();
    } else {
      this.removeRowByKey(p.data, key);
      this.setVs({
        ...toView(this.viewState.get()),
        form: { value: this.defaultForm(), status: "idle", mode: "create" },
        flowMessage: "Fila eliminada en memoria (sin HTTP).",
      });
      this.invalidateLookupCaches();
    }
  }

  private mergeRowLocal(row: OpenApiRow): void {
    const k = this.discovered.rowKey;
    const id = String(row[k]);
    const next = this.rows.map((r) => (String(r[k]) === id ? { ...r, ...row } : r));
    this.setRows(mergeListRowsByKey<OpenApiRow>(this.rows, next, k));
  }

  private removeRowByKey(row: OpenApiRow, k: string): void {
    const id = String(row[k]);
    const next = this.rows.filter((r) => String(r[k]) !== id);
    this.setRows(next);
  }

  private pushAndRefresh(out: OpenApiRow): void {
    const key = this.discovered.rowKey;
    const withKey = { ...out };
    if (withKey[key] === undefined || withKey[key] === null) {
      withKey[key] = `local-${Date.now()}` as unknown as string;
    }
    const nextOrder = [withKey, ...this.rows];
    const merged = mergeListRowsByKey<OpenApiRow>(this.rows, nextOrder, key);
    this.setRows(merged);
    this.setVs({
      list: { rows: merged, status: "ready" },
      form: { value: this.defaultForm(), status: "success", mode: "create" },
      flowMessage: "Creado (al menos en memoria) según swagger",
    });
    this.invalidateLookupCaches();
  }

  setFormFieldErrors(map: Record<string, string>): void {
    this.setVs({
      ...toView(this.viewState.get()),
      form: { ...toView(this.viewState.get()).form, status: "error", fieldErrors: map },
    });
  }

  async fetchLookupOptions(a: {
    endpoint: string;
    valueField: string;
    labelField: string;
    dataPath?: string;
  }): Promise<Array<{ value: string; label: string }>> {
    const cacheKey = JSON.stringify(a);
    const cached = DynamicCrudAgent.lookupCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    if (!this.http) {
      return [];
    }
    const incoming = await this.http.getJson<unknown>(a.endpoint);
    const out = mapJsonToFieldSelectItems(incoming, a);
    DynamicCrudAgent.lookupCache.set(cacheKey, out);
    return out;
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
function zodErrorToMap(e: { issues: { path: (string | number)[]; message: string }[] }): Record<string, string> {
  const o: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? "_");
    o[k] ??= i.message;
  }
  return o;
}
