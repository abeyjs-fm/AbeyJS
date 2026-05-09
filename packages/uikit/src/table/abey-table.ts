import { intentOf } from "@abeyjs/core";
import { AbeyTableAction, AbeyTableCell, AbeyTableColumn, AbeyTableConfig, AbeyTableLoadNetworkDetail } from "./abey-table.types.js";
import { AbeyTableActionJson, AbeyTableActionsPayload, AbeyTableColumnJson, appendTrustedCellContent, appendUntrustedCellContent, clampText, clear, el, getDeepestActiveElement, isTemplatePlaceholder, parseWidthPx, renderTemplateFragment } from "../utils/abeyjs-table.fn.js";
export class AbeyTableElement<Row = unknown> extends HTMLElement {
  static get observedAttributes() {
    return [
      "items",
      "[items]",
      "columns",
      "[columns]",
      "actions",
      "[actions]",
      "selectable",
      "dense",
      "page",
      "pageSize",
      "pageSizes",
      "totalItems",
      "loadNetwork",
      // lowercase variants (HTML normalizes attribute names)
      "pagesize",
      "pagesizes",
      "totalitems",
      "loadnetwork",
      "flow",
      "runtimePath",
      "intentLoad",
      "intentSelection",
      "intentAction",
      "intentSearch",
      "eventData",
      "eventColumns",
      "eventItems",
      "eventActions",
      "autoLoad",
      // lowercase variants
      "runtimepath",
      "intentload",
      "intentselection",
      "intentaction",
      "intentsearch",
      "eventdata",
      "eventcolumns",
      "eventitems",
      "eventactions",
      "autoload",
      "cellimglazy",
    ];
  }

  static define(tagName = "abey-table") {
    if (!customElements.get(tagName)) customElements.define(tagName, AbeyTableElement as CustomElementConstructor);
  }

  #config: AbeyTableConfig<Row> | null = null;
  #selected = new Set<string>();
  #openMenuForRowId: string | null = null;
  #menuPortal: HTMLElement | null = null;
  #rowIdByObject = new WeakMap<object, string>();
  #autoRowSeq = 0;
  #visibleRowIds: string[] = [];
  #rowById = new Map<string, Row>();
  #rowByIdAll = new Map<string, Row>();
  #page = 1;
  #pageSize = 10;
  #pageSizes: number[] = [10, 20, 30];
  #totalItems: number | null = null;
  #loadNetwork = false;
  #renderers: Record<string, (row: Row) => AbeyTableCell> = {};
  #cellTemplates = new Map<string, HTMLTemplateElement>();
  #flowEnabled = false;
  #runtimePath = "__abeyRuntime";
  #intentLoad: string | null = null;
  #intentSelection: string | null = null;
  #intentAction: string | null = null;
  #intentSearch: string | null = null;
  #eventData: string | null = null; // legacy: single payload with items/columns
  #eventColumns: string | null = null;
  #eventItems: string | null = null;
  #eventActions: string | null = null;
  #autoLoad = true;
  #unsubFlow: (() => void) | null = null;
  #suppressLoadEmit = false;
  #query = "";
  #searchTimer: number | null = null;
  /** ms sin teclear antes de disparar `intentSearch` / carga red con la query actual */
  static searchDebounceMs = 250;
  /** Tras `TableLoad` por flow: mostrar skeleton hasta `eventItems`. */
  #networkLoading = false;
  /**
   * El usuario enfocó el buscador — restaurar tras renders async (skeleton / `eventItems`) aunque el `focusout`
   * venga con `relatedTarget === null` (nodo quitado antes de cargar datos).
   */
  #searchUserKeepsFocus = false;

  /** Mismo nodo toolbar search entre renders (`remove` antes de `clear`) — evita blur al reemplazar el árbol. */
  #boundSearchKeydown = (ev: KeyboardEvent): void => {
    const t = ev.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains("search")) return;
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    this.#flushPendingSearchDispatch();
  };

  #boundSearchInput = (ev: Event): void => {
    const t = ev.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains("search")) return;
    this.#query = t.value;
    this.#page = 1;
    this.#emitSearch();
    /*
     * Búsqueda remota (`loadNetwork` + `intentLoad` + flow) ya hace `render()` en `#flowDispatchLoad` / `#applyFlowItems`.
     * Re-render sincrónico en cada tecla reemplaza el grafo → sensación de “perder cursor” entre refrescos.
     */
    const serverKeyedSearch =
      this.#flowEnabled && (Boolean(this.#intentSearch) || (Boolean(this.#intentLoad) && this.#loadNetwork));
    if (!serverKeyedSearch) {
      this.render();
    }
  };

  #boundSearchFocusIn = (ev: FocusEvent): void => {
    const t = ev.target;
    if (t instanceof HTMLInputElement && t.classList.contains("search")) {
      this.#searchUserKeepsFocus = true;
    }
  };

  #boundSearchFocusOut = (ev: FocusEvent): void => {
    const t = ev.target;
    if (!(t instanceof HTMLInputElement) || !t.classList.contains("search")) return;
    const rt = ev.relatedTarget as Node | null;
    // Blur porque el DOM se reemplaza (clave al cargar): no borrar `#searchUserKeepsFocus`.
    if (rt == null) return;
    if (this.contains(rt)) return;
    const el = rt instanceof Element ? rt : rt.parentElement;
    if (el instanceof Element && el.closest(".abey-table-menu, [data-abey-menu='1']")) return;
    this.#searchUserKeepsFocus = false;
    this.#flushPendingSearchDispatch();
  };

  /** Clic fuera de la tabla (y fuera del menú portado) → el usuario ya no busca ahí . */
  #boundDocPointerForSearchStick = (ev: Event): void => {
    if (!this.#searchUserKeepsFocus) return;
    const tgt = ev.target as Node | null;
    if (!(tgt instanceof Node)) return;
    if (this.contains(tgt)) return;
    const host = tgt instanceof Element ? tgt : (tgt.parentElement as Element | null);
    if (host instanceof Element && host.closest(".abey-table-menu, [data-abey-menu='1']")) return;
    this.#searchUserKeepsFocus = false;
    this.#flushPendingSearchDispatch();
  };

  /** Antes de vaciar el DOM: si el buscador tenía foco, guardamos el caret para restaurarlo al final de `render()`. */
  #captureSearchCaretForRestore(): { start: number; end: number } | null {
    // Prefer subtree match (no retarget quirks); then deep activeElement; then :focus-within + single toolbar input.
    let ae =
      (this.querySelector("input.search:focus") as HTMLInputElement | null) ??
      (() => {
        const deep = getDeepestActiveElement(document);
        if (deep instanceof HTMLInputElement && deep.classList.contains("search") && this.contains(deep)) return deep;
        return null;
      })();
    if (!ae && this.matches(":focus-within")) {
      ae = this.querySelector("input.search") as HTMLInputElement | null;
    }
    if (ae instanceof HTMLInputElement && ae.classList.contains("search")) {
      let start = ae.selectionStart;
      let end = ae.selectionEnd;
      if (start == null || end == null) {
        start = end = this.#query.length;
      }
      return { start, end };
    }

    if (this.#searchUserKeepsFocus) {
      const len = this.#query.length;
      return { start: len, end: len };
    }
    return null;
  }

  #restoreSearchCaret(caret: { start: number; end: number } | null): void {
    if (!caret) return;
    const search = this.querySelector("input.search") as HTMLInputElement | null;
    if (!search) return;
    search.value = this.#query;
    try {
      search.focus({ preventScroll: true });
      const max = this.#query.length;
      const s = Math.max(0, Math.min(caret.start, max));
      const e = Math.max(0, Math.min(caret.end, max));
      search.setSelectionRange(s, e);
    } catch {
      /* ignore */
    }
  }

  /** Run after OM / browser paint — single microtask loses to parent updates in some stacks. */
  #scheduleSearchFocusRestore(caret: { start: number; end: number } | null): void {
    if (!caret) return;
    queueMicrotask(() => {
      this.#restoreSearchCaret(caret);
      requestAnimationFrame(() => this.#restoreSearchCaret(caret));
    });
  }

  #appendNetworkSkeletonOverlay(tableScroll: HTMLElement): void {
    const overlay = el("div", {
      class: "abey-table-skeletonOverlay",
      role: "status",
      "aria-live": "polite",
      "aria-busy": "true",
    });
    const sr = el("span", { class: "abey-table-skeletonSr" }, ["Cargando datos…"]);
    overlay.append(sr);
    const nRows = Math.min(Math.max(3, this.#pageSize), 14);
    const widths = ["42%", "68%", "55%", "78%", "50%", "62%"];
    for (let i = 0; i < nRows; i++) {
      const row = el("div", { class: "abey-table-skeletonRow" });
      for (let j = 0; j < 5; j++) {
        const w = widths[(i + j) % widths.length]!;
        row.append(el("div", { class: "abey-table-skeletonBar", style: `width:${w}` }));
      }
      overlay.append(row);
    }
    tableScroll.append(overlay);
  }

  get selectedIds(): ReadonlySet<string> {
    return this.#selected;
  }

  set config(cfg: AbeyTableConfig<Row>) {
    this.#config = cfg;
    this.#selected = new Set(cfg.initialSelectedIds ?? []);
    this.render();
  }

  set items(rows: Array<Row>) {
    this.#ensureConfig();
    this.#config = { ...this.#config!, rows };
    this.render();
  }

  set columns(cols: Array<AbeyTableColumn<Row>>) {
    this.#ensureConfig();
    this.#config = { ...this.#config!, columns: cols };
    this.render();
  }

  set actions(actions: Array<AbeyTableAction<Row>>) {
    this.#ensureConfig();
    this.#config = { ...this.#config!, actions };
    this.render();
  }

  set renderers(v: Record<string, (row: Row) => AbeyTableCell>) {
    this.#renderers = v ?? {};
    this.render();
  }

  set selectable(v: boolean) {
    this.#ensureConfig();
    this.#config = { ...this.#config!, selectable: v };
    this.render();
  }

  set dense(v: boolean) {
    this.#ensureConfig();
    this.#config = { ...this.#config!, dense: v };
    this.render();
  }

  set page(v: number) {
    const next = Number.isFinite(v) && v > 0 ? Math.floor(v) : 1;
    if (next === this.#page) return;
    this.#page = next;
    this.#maybeEmitLoad();
    this.render();
  }

  set pageSize(v: number) {
    const next = Number.isFinite(v) && v > 0 ? Math.floor(v) : 10;
    if (next === this.#pageSize) return;
    this.#pageSize = next;
    this.#page = 1;
    this.#maybeEmitLoad();
    this.render();
  }

  set pageSizes(v: number[]) {
    const next = (v ?? []).map((x) => Math.floor(Number(x))).filter((x) => Number.isFinite(x) && x > 0);
    if (next.length) this.#pageSizes = Array.from(new Set(next));
    if (!this.#pageSizes.includes(this.#pageSize)) this.#pageSize = this.#pageSizes[0] ?? this.#pageSize;
    this.render();
  }

  set totalItems(v: number | null) {
    const next = v == null ? null : Math.max(0, Math.floor(Number(v)));
    this.#totalItems = Number.isFinite(next as any) ? next : null;
    this.render();
  }

  set loadNetwork(v: boolean) {
    this.#loadNetwork = !!v;
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (newValue === _oldValue) return;
    this.#ensureConfig();
    const n = name.toLowerCase();

    if (n === "selectable") {
      const v = newValue !== null && newValue !== "false";
      this.#config = { ...this.#config!, selectable: v };
      this.render();
      return;
    }
    if (n === "dense") {
      const v = newValue !== null && newValue !== "false";
      this.#config = { ...this.#config!, dense: v };
      this.render();
      return;
    }
    if (n === "loadnetwork") {
      this.#loadNetwork = newValue !== null && newValue !== "false";
      if (this.#autoLoad && this.#flowEnabled && this.#intentLoad && this.#loadNetwork) {
        this.#flowDispatchLoad();
      }
      return;
    }
    if (n === "flow") {
      this.#flowEnabled = newValue !== null && newValue !== "false";
      this.#attachFlow();
      return;
    }
    if (n === "runtimepath") {
      this.#runtimePath = (newValue ?? "").trim() || "__abeyRuntime";
      this.#attachFlow();
      return;
    }
    if (n === "intentload") {
      if (isTemplatePlaceholder(newValue)) return;
      this.#intentLoad = (newValue ?? "").trim() || null;
      this.#attachFlow();
      return;
    }
    if (n === "intentselection") {
      if (isTemplatePlaceholder(newValue)) return;
      this.#intentSelection = (newValue ?? "").trim() || null;
      return;
    }
    if (n === "intentaction") {
      if (isTemplatePlaceholder(newValue)) return;
      this.#intentAction = (newValue ?? "").trim() || null;
      return;
    }
    if (n === "intentsearch") {
      if (isTemplatePlaceholder(newValue)) return;
      this.#intentSearch = (newValue ?? "").trim() || null;
      return;
    }
    if (n === "cellimglazy") {
      this.render();
      return;
    }
    if (n === "eventdata") {
      if (isTemplatePlaceholder(newValue)) return;
      this.#eventData = (newValue ?? "").trim() || null;
      this.#attachFlow();
      return;
    }
    if (n === "eventcolumns") {
      if (isTemplatePlaceholder(newValue)) return;
      this.#eventColumns = (newValue ?? "").trim() || null;
      this.#attachFlow();
      return;
    }
    if (n === "eventitems") {
      if (isTemplatePlaceholder(newValue)) return;
      this.#eventItems = (newValue ?? "").trim() || null;
      this.#attachFlow();
      return;
    }
    if (n === "eventactions") {
      if (isTemplatePlaceholder(newValue)) return;
      this.#eventActions = (newValue ?? "").trim() || null;
      this.#attachFlow();
      return;
    }
    if (n === "autoload") {
      this.#autoLoad = newValue !== null && newValue !== "false";
      return;
    }
    if (n === "page") {
      const n = Math.max(1, Math.floor(Number(newValue ?? "1")));
      this.page = n;
      return;
    }
    if (n === "pagesize") {
      const n = Math.max(1, Math.floor(Number(newValue ?? "10")));
      this.pageSize = n;
      return;
    }
    if (n === "pagesizes") {
      const raw = (newValue ?? "").trim();
      const nums = raw
        .split(/[,\s]+/g)
        .filter(Boolean)
        .map((x) => Math.floor(Number(x)))
        .filter((x) => Number.isFinite(x) && x > 0);
      this.pageSizes = nums.length ? nums : [10, 20, 30];
      return;
    }
    if (n === "totalitems") {
      const n = newValue == null || newValue === "" ? null : Math.max(0, Math.floor(Number(newValue)));
      this.totalItems = Number.isFinite(n as any) ? n : null;
      return;
    }

    const fromAttr = this.#resolveAttrValue(newValue);
    if (name === "items" || name === "[items]") {
      const rows = Array.isArray(fromAttr) ? (fromAttr as Array<Row>) : [];
      this.#config = { ...this.#config!, rows };
      this.render();
      return;
    }
    if (name === "columns" || name === "[columns]") {
      const colsJson = Array.isArray(fromAttr) ? (fromAttr as Array<AbeyTableColumnJson>) : [];
      const cols: Array<AbeyTableColumn<Row>> = colsJson.map((c) => ({
        key: c.key,
        header: c.header ?? c.key,
        width: c.width,
        align: c.align,
        frozen: c.frozen,
        render:
          typeof c.render === "string" && c.render.trim()
            ? ((row: Row) => {
                const key = c.render!.trim();
                const local = this.#renderers[key];
                if (typeof local === "function") return local(row);
                const fn = this.#resolveGlobalPath(key);
                return typeof fn === "function" ? fn(row) : (row as any)?.[c.key];
              })
            : undefined,
        value: (row) => (row as any)?.[c.key],
      }));
      this.#config = { ...this.#config!, columns: cols };
      this.render();
      return;
    }
    if (name === "actions" || name === "[actions]") {
      const actsJson = Array.isArray(fromAttr) ? (fromAttr as Array<AbeyTableActionJson>) : [];
      const actions: Array<AbeyTableAction<Row>> = actsJson.map((a) => ({
        id: a.id,
        label: a.label,
        eventName: a.eventName ?? "action",
      }));
      this.#config = { ...this.#config!, actions };
      this.render();
      return;
    }
  }

  connectedCallback() {
    this.classList.add("abey-table");
    if (!this.firstChild) this.render();
    this.addEventListener("click", (ev) => this.#onClick(ev));
    document.addEventListener("click", (ev) => this.#onDocClick(ev), { capture: true });
    document.addEventListener("pointerdown", this.#boundDocPointerForSearchStick, { capture: true });
    this.addEventListener("focusin", this.#boundSearchFocusIn);
    this.addEventListener("focusout", this.#boundSearchFocusOut);
    this.#attachFlow();
    // Ensure autoload after upgrade+attrs ordering settles
    queueMicrotask(() => {
      this.#attachFlow();
      if (this.#autoLoad && this.#flowEnabled && this.#intentLoad && this.#loadNetwork) {
        this.#flowDispatchLoad();
      }
    });
  }

  disconnectedCallback() {
    if (this.#searchTimer != null) {
      window.clearTimeout(this.#searchTimer);
      this.#searchTimer = null;
    }
    document.removeEventListener("click", (ev) => this.#onDocClick(ev), { capture: true } as AddEventListenerOptions);
    document.removeEventListener("pointerdown", this.#boundDocPointerForSearchStick, { capture: true });
    this.removeEventListener("focusin", this.#boundSearchFocusIn);
    this.removeEventListener("focusout", this.#boundSearchFocusOut);
    this.#detachFlow();
  }

  setData(patch: Partial<Pick<AbeyTableConfig<Row>, "rows" | "columns" | "actions" | "rowActions" | "selectable">>) {
    if (!this.#config) return;
    this.#config = { ...this.#config, ...patch };
    this.render();
  }

  select(ids: Iterable<string>, mode: "replace" | "add" | "remove" = "replace") {
    const next = mode === "replace" ? new Set<string>() : new Set(this.#selected);
    for (const id of ids) {
      if (mode === "remove") next.delete(id);
      else next.add(id);
    }
    this.#selected = next;
    this.#emitSelectionChange();
    this.#updateSelectionUi();
  }

  render() {
    const savedSearchCaret = this.#captureSearchCaretForRestore();
    const cfg = this.#config;
    let reusedToolbarSearchEl: HTMLInputElement | null = this.querySelector("input.search") as HTMLInputElement | null;
    if (reusedToolbarSearchEl) reusedToolbarSearchEl.remove(); // detach before clear (node survives for reuse)

    const preservedTemplates = Array.from(this.querySelectorAll("template[data-abey-cell]")) as HTMLTemplateElement[];
    this.#cellTemplates.clear();
    for (const t of preservedTemplates) {
      const key = (t.getAttribute("data-abey-cell") ?? "").trim();
      if (key) this.#cellTemplates.set(key, t);
    }

    clear(this);
    this.#rowById.clear();
    this.#rowByIdAll.clear();

    const wrap = el("div", { class: `wrap ${cfg?.dense ? "dense" : ""}` });
    const table = el("table", { class: "table" });
    const tableScroll = el("div", { class: "tableScroll" });

    if (!cfg) {
      reusedToolbarSearchEl = null;
      table.append(el("tbody", {}, [el("tr", {}, [el("td", {}, ["No config"])])]));
      tableScroll.append(table);
      wrap.append(tableScroll);
      this.append(wrap);
      if (savedSearchCaret) this.#scheduleSearchFocusRestore(savedSearchCaret);
      return;
    }

    const rows = cfg.rows ?? [];
    const columns = cfg.columns ?? [];
    const getRowId = cfg.getRowId ?? ((row: Row) => this.#defaultRowId(row));
    for (const r of rows) this.#rowByIdAll.set(getRowId(r), r);
    // En `loadNetwork` la búsqueda va al servicio (payload `query`); no re-filtrar aquí para no desincronizar con la API.
    const filteredRows = this.#loadNetwork
      ? rows
      : this.#query.trim()
        ? this.#filterRows(rows, columns, this.#query)
        : rows;
    // In network mode, totalItems usually comes from server; keep it stable even if we client-filter visible rows.
    const totalItems = this.#loadNetwork ? (this.#totalItems ?? rows.length) : filteredRows.length;
    const pageCount = Math.max(1, Math.ceil(totalItems / Math.max(1, this.#pageSize)));
    const page = Math.min(Math.max(1, this.#page), pageCount);
    if (page !== this.#page) this.#page = page;
    const visibleRows =
      this.#loadNetwork
        ? filteredRows
        : filteredRows.slice((page - 1) * this.#pageSize, (page - 1) * this.#pageSize + this.#pageSize);
    this.#visibleRowIds = visibleRows.map((r: Row) => getRowId(r));
    for (let i = 0; i < visibleRows.length; i++) this.#rowById.set(this.#visibleRowIds[i]!, visibleRows[i]!);

    const thead = el("thead");
    const headRow = el("tr");

    const selectable = !!cfg.selectable;
    const hasActions = (cfg.actions?.length ?? 0) > 0 || !!cfg.rowActions;

    const leftOffsets = new Map<string, number>();
    const rightOffsets = new Map<string, number>();

    let leftPx = selectable ? 44 : 0;
    for (const c of columns) {
      if (c.frozen === "left") {
        leftOffsets.set(c.key, leftPx);
        leftPx += parseWidthPx(c.width) ?? 0;
      }
    }

    let rightPx = hasActions ? 52 : 0;
    for (let i = columns.length - 1; i >= 0; i--) {
      const c = columns[i]!;
      if (c.frozen === "right") {
        rightOffsets.set(c.key, rightPx);
        rightPx += parseWidthPx(c.width) ?? 0;
      }
    }
    if (selectable) {
      const th = el("th", { class: "checkCol" });
      const all = el("input", { type: "checkbox", "data-check-all": "1" }) as HTMLInputElement;
      const rowIds = this.#visibleRowIds;
      const allSelected = rowIds.length > 0 && rowIds.every((id) => this.#selected.has(id));
      const someSelected = rowIds.some((id) => this.#selected.has(id));
      all.checked = allSelected;
      all.indeterminate = !allSelected && someSelected;
      all.addEventListener("change", () => {
        if (all.checked) this.select(rowIds, "replace");
        else this.select([], "replace");
      });
      th.append(all);
      headRow.append(th);
    }

    for (const c of columns) {
      const th = el("th");
      if (c.width) th.style.width = c.width;
      if (c.align) th.style.textAlign = c.align;
      if (c.frozen === "left") {
        th.classList.add("freeze", "freeze--left");
        th.style.position = "sticky";
        th.style.left = `${leftOffsets.get(c.key) ?? 0}px`;
      } else if (c.frozen === "right") {
        th.classList.add("freeze", "freeze--right");
        th.style.position = "sticky";
        th.style.right = `${rightOffsets.get(c.key) ?? 0}px`;
      }
      const head = el("div", { class: "colHead" });
      if (c.header instanceof Node) head.append(c.header);
      else head.append(document.createTextNode(String(c.header)));
      th.append(head);
      headRow.append(th);
    }

    if (hasActions) {
      const th = el("th", { class: "actionsCol freeze freeze--right" });
      th.style.position = "sticky";
      th.style.right = "0px";
      headRow.append(th);
    }

    thead.append(headRow);
    table.append(thead);

    const tbody = el("tbody");
    for (const row of visibleRows) {
      const rowId = getRowId(row);
      const tr = el("tr");

      if (selectable) {
        const td = el("td", { class: "checkCol" });
        const cb = el("input", { type: "checkbox", "data-row-check": "1", "data-row-id": rowId }) as HTMLInputElement;
        cb.checked = this.#selected.has(rowId);
        cb.addEventListener("change", () => {
          if (cb.checked) this.select([rowId], "add");
          else this.select([rowId], "remove");
        });
        td.append(cb);
        tr.append(td);
      }

      for (const c of columns) {
        const td = el("td");
        if (c.align) td.style.textAlign = c.align;
        if (c.frozen === "left") {
          td.classList.add("freeze", "freeze--left");
          td.style.position = "sticky";
          td.style.left = `${leftOffsets.get(c.key) ?? 0}px`;
        } else if (c.frozen === "right") {
          td.classList.add("freeze", "freeze--right");
          td.style.position = "sticky";
          td.style.right = `${rightOffsets.get(c.key) ?? 0}px`;
        }
        const host = el("div", { class: "cell" });

        const tpl = this.#cellTemplates.get(c.key);
        if (tpl) {
          host.append(renderTemplateFragment(tpl, row as any, this.getAttribute("cellimglazy") !== "false"));
        } else if (c.render) {
          const value = c.render(row);
          appendTrustedCellContent(host, value);
        } else {
          const value = c.value ? c.value(row) : (row as any)?.[c.key];
          if (typeof value === "string") host.append(clampText(value));
          else if (typeof value === "number" || typeof value === "boolean") host.append(clampText(String(value)));
          else appendUntrustedCellContent(host, value);
        }

        td.append(host);
        tr.append(td);
      }

      if (hasActions) {
        const td = el("td", { class: "actionsCol rowAnchor freeze freeze--right" });
        td.style.position = "sticky";
        td.style.right = "0px";
        const btn = el("button", { class: "kebab", type: "button", "data-row-id": rowId }) as HTMLButtonElement;
        btn.append(el("div", { class: "dots" }, [el("span")]));
        td.append(btn);

        tr.append(td);
      }

      tbody.append(tr);
    }
    table.append(tbody);
    tableScroll.append(table);
    if (this.#loadNetwork && this.#networkLoading) {
      this.#appendNetworkSkeletonOverlay(tableScroll);
    }

    const toolbar = el("div", { class: "toolbar" });
    const reusedSearchInstance = reusedToolbarSearchEl != null;
    const search = reusedToolbarSearchEl ?? document.createElement("input");
    if (!reusedSearchInstance) {
      search.type = "search";
      search.className = "search";
      search.placeholder = "Search…";
    }
    search.value = this.#query;
    if (search.dataset.abeySearchBound !== "1") {
      search.dataset.abeySearchBound = "1";
      search.addEventListener("input", this.#boundSearchInput);
      search.addEventListener("keydown", this.#boundSearchKeydown);
    }
    toolbar.append(search);

    wrap.append(toolbar, tableScroll);

    // footer pagination
    const footer = el("div", { class: "footer" });
    const footerLeft = el("div", { class: "footerLeft" }, [
      `Page `,
      el("strong", {}, [String(page)]),
      ` of `,
      el("strong", {}, [String(pageCount)]),
    ]);

    const sizeSelect = document.createElement("select");
    sizeSelect.className = "pageSize";
    for (const s of this.#pageSizes) {
      const opt = document.createElement("option");
      opt.value = String(s);
      opt.textContent = String(s);
      if (s === this.#pageSize) opt.selected = true;
      sizeSelect.append(opt);
    }
    sizeSelect.addEventListener("change", () => {
      this.pageSize = Math.max(1, Math.floor(Number(sizeSelect.value)));
    });

    const footerRight = el("div", { class: "footerRight" });
    const prev = el("button", { type: "button", class: "pagerBtn" }, ["Prev"]) as HTMLButtonElement;
    prev.disabled = page <= 1;
    prev.addEventListener("click", () => (this.page = page - 1));
    const next = el("button", { type: "button", class: "pagerBtn" }, ["Next"]) as HTMLButtonElement;
    next.disabled = page >= pageCount;
    next.addEventListener("click", () => (this.page = page + 1));

    footerRight.append(el("span", { class: "label" }, ["Rows"]), sizeSelect, prev, next);
    footer.append(footerLeft, footerRight);
    wrap.append(footer);

    this.append(wrap);
    if (preservedTemplates.length) {
      const tplHost = el("div", { style: "display:none", "data-abey-templates": "1" });
      for (const t of preservedTemplates) tplHost.append(t);
      this.append(tplHost);
    }

    // reopen menu without full rerender for current row
    if (this.#openMenuForRowId) this.#openMenu(this.#openMenuForRowId);
    const caretReuse =
      savedSearchCaret ??
      (reusedSearchInstance && this.#searchUserKeepsFocus
        ? { start: this.#query.length, end: this.#query.length }
        : null);
    if (reusedSearchInstance && caretReuse) {
      queueMicrotask(() => this.#restoreSearchCaret(caretReuse));
    } else if (savedSearchCaret) {
      this.#scheduleSearchFocusRestore(savedSearchCaret);
    }
  }

  #updateSelectionUi() {
    // Update header checkbox (checked/indeterminate) and keep row checkboxes consistent.
    const root = this;
    const rowIds = this.#visibleRowIds;

    const all = root.querySelector('input[type="checkbox"][data-check-all="1"]') as HTMLInputElement | null;
    if (all) {
      const allSelected = rowIds.length > 0 && rowIds.every((id) => this.#selected.has(id));
      const someSelected = rowIds.some((id) => this.#selected.has(id));
      all.checked = allSelected;
      all.indeterminate = !allSelected && someSelected;
    }

    const rowChecks = root.querySelectorAll('input[type="checkbox"][data-row-check="1"][data-row-id]');
    for (const cb of Array.from(rowChecks) as HTMLInputElement[]) {
      const id = cb.dataset.rowId;
      if (!id) continue;
      const next = this.#selected.has(id);
      if (cb.checked !== next) cb.checked = next;
    }
  }

  #ensureConfig() {
    if (!this.#config) this.#config = {};
  }

  #defaultRowId(row: Row) {
    const anyRow = row as any;
    const byId = anyRow?.id;
    if (byId != null) return String(byId);
    if (typeof row === "object" && row !== null) {
      const cached = this.#rowIdByObject.get(row as object);
      if (cached) return cached;
      const next = `row_${++this.#autoRowSeq}`;
      this.#rowIdByObject.set(row as object, next);
      return next;
    }
    return `row_${++this.#autoRowSeq}`;
  }

  #resolveAttrValue(raw: string | null) {
    if (!raw) return null;
    const v = raw.trim();
    if (!v) return null;
    if (v.startsWith("{") || v.startsWith("[")) {
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    }
    return this.#resolveGlobalPath(v);
  }

  #resolveGlobalPath(expr: string) {
    const clean = expr.replace(/^\{\{\s*|\s*\}\}$/g, "").trim();
    const parts = clean.split(".").filter(Boolean);
    let cur: any = globalThis as any;
    for (const p of parts) {
      if (cur == null) return null;
      cur = cur[p];
    }
    return cur ?? null;
  }

  #maybeEmitLoad() {
    if (!this.#loadNetwork) return;
    if (!this.#suppressLoadEmit) this.#flowDispatchLoad();
    const detail: AbeyTableLoadNetworkDetail = { page: this.#page, pageSize: this.#pageSize, query: this.#query };
    this.dispatchEvent(new CustomEvent<AbeyTableLoadNetworkDetail>("loadNetwork", { detail, bubbles: true, composed: true }));
  }

  #getRuntime(): any | null {
    const parts = this.#runtimePath.split(".").filter(Boolean);
    let cur: any = globalThis as any;
    for (const p of parts) {
      if (cur == null) return null;
      cur = cur[p];
    }
    return cur ?? null;
  }

  #detachFlow() {
    this.#unsubFlow?.();
    this.#unsubFlow = null;
  }

  #attachFlow() {
    this.#detachFlow();
    if (!this.isConnected) return;
    if (!this.#flowEnabled) return;
    if (!this.#eventData && !this.#eventColumns && !this.#eventItems && !this.#eventActions) return;
    const runtime = this.#getRuntime();
    const channel = runtime?.channel;
    if (!channel?.onAll) return;
    this.#unsubFlow = channel.onAll((ev: any) => {
      const name = String(ev?.name ?? "");
      if (this.#eventColumns && name === this.#eventColumns) {
        this.#applyFlowColumns(ev?.payload);
        return;
      }
      if (this.#eventItems && name === this.#eventItems) {
        this.#applyFlowItems(ev?.payload);
        return;
      }
      if (this.#eventActions && name === this.#eventActions) {
        this.#applyFlowActions(ev?.payload);
        return;
      }
      if (this.#eventData && name === this.#eventData) {
        this.#applyFlowColumns(ev?.payload);
        this.#applyFlowItems(ev?.payload);
        this.#applyFlowActions(ev?.payload);
      }
    });

    if (this.#autoLoad && this.#loadNetwork) this.#flowDispatchLoad();
  }

  #flowDispatchLoad() {
    if (!this.#flowEnabled) return;
    if (!this.#intentLoad) return;
    const runtime = this.#getRuntime();
    if (!runtime?.dispatch) return;
    if (this.#loadNetwork) {
      this.#networkLoading = true;
      this.render();
    }
    try {
      void runtime.dispatch(
        intentOf(this.#intentLoad, { page: this.#page, pageSize: this.#pageSize, query: this.#query }),
        { source: "abey-table" },
      );
    } catch {
      this.#networkLoading = false;
      this.render();
    }
  }

  #applyFlowColumns(payload: any) {
    const colsJson = Array.isArray(payload?.columns) ? payload.columns : [];
    if (!colsJson.length) return;
    const cols: Array<AbeyTableColumn<Row>> = (colsJson as Array<AbeyTableColumnJson>).map((c) => ({
      key: c.key,
      header: (c as any).header ?? c.key,
      width: (c as any).width,
      align: (c as any).align,
      frozen: (c as any).frozen,
      render:
        typeof (c as any).render === "string" && String((c as any).render).trim()
          ? ((row: Row) => {
              const key = String((c as any).render).trim();
              const local = this.#renderers[key];
              if (typeof local === "function") return local(row);
              const fn = this.#resolveGlobalPath(key);
              return typeof fn === "function" ? fn(row) : (row as any)?.[c.key];
            })
          : undefined,
      value: (row) => (row as any)?.[c.key],
    }));
    this.#ensureConfig();
    this.#config = { ...this.#config!, columns: cols };
    this.render();
  }

  #applyFlowItems(payload: any) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!items.length && payload?.items != null) {
      // items present but empty -> allow render
    }
    const totalItems = payload?.totalItems;
    const page = payload?.page;
    const pageSize = payload?.pageSize;

    if (typeof totalItems === "number") this.#totalItems = Math.max(0, Math.floor(totalItems));

    this.#suppressLoadEmit = true;
    try {
      if (typeof pageSize === "number" && pageSize > 0) this.#pageSize = Math.floor(pageSize);
      if (typeof page === "number" && page > 0) this.#page = Math.floor(page);
    } finally {
      this.#suppressLoadEmit = false;
    }

    if (payload?.items == null) return;
    this.#ensureConfig();
    if (this.#loadNetwork) this.#networkLoading = false;
    this.#config = { ...this.#config!, rows: items };
    this.render();
  }

  #applyFlowActions(payload: any) {
    const actsJson = Array.isArray(payload?.actions) ? payload.actions : Array.isArray((payload as AbeyTableActionsPayload)?.actions) ? (payload as any).actions : [];
    if (!Array.isArray(actsJson) || actsJson.length === 0) return;
    const actions: Array<AbeyTableAction<Row>> = (actsJson as AbeyTableActionJson[]).map((a) => ({
      id: a.id,
      label: a.label,
      eventName: a.eventName ?? "action",
    }));
    this.#ensureConfig();
    this.#config = { ...this.#config!, actions };
    this.render();
  }

  #filterRows(all: Row[], columns: Array<AbeyTableColumn<Row>>, query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((row) => {
      for (const c of columns) {
        const searchValue = (c as any)?.searchValue as ((r: Row) => unknown) | undefined;
        const v = searchValue ? searchValue(row) : c.value ? c.value(row) : (row as any)?.[c.key];
        if (v == null) continue;
        const txt = this.#toSearchText(v);
        if (txt && txt.includes(q)) return true;
      }
      return false;
    });
  }

  #toSearchText(v: unknown): string {
    if (v == null) return "";
    if (typeof v === "string") return v.toLowerCase();
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v).toLowerCase();
    if (Array.isArray(v)) return v.map((x) => this.#toSearchText(x)).filter(Boolean).join(" ");
    if (typeof v === "object") {
      const anyV = v as any;
      if (typeof anyV.name === "string") return anyV.name.toLowerCase();
      if (typeof anyV.label === "string") return anyV.label.toLowerCase();
      if (typeof anyV.title === "string") return anyV.title.toLowerCase();
      try {
        return JSON.stringify(v).toLowerCase();
      } catch {
        return "";
      }
    }
    return String(v).toLowerCase();
  }

  /** Intento de servidor/flow cuando la búsqueda se estabiliza (debounce). */
  #runScheduledSearchDispatch() {
    const runtime = this.#getRuntime();
    if (!runtime?.dispatch) return;
    if (this.#flowEnabled && this.#intentSearch) {
      try {
        void runtime.dispatch(
          intentOf(this.#intentSearch!, { query: this.#query, page: this.#page, pageSize: this.#pageSize }),
          { source: "abey-table" },
        );
      } catch {
        /* ignore */
      }
    } else if (this.#loadNetwork && this.#flowEnabled && this.#intentLoad && !this.#suppressLoadEmit) {
      this.#maybeEmitLoad();
    }
  }

  /** Si hay un disparo aplazado tras teclear, ejecutarlo ya (blur fuera / Enter). */
  #flushPendingSearchDispatch() {
    if (this.#searchTimer == null) return;
    window.clearTimeout(this.#searchTimer);
    this.#searchTimer = null;
    this.#runScheduledSearchDispatch();
  }

  #emitSearch() {
    if (this.#searchTimer != null) window.clearTimeout(this.#searchTimer);
    this.#searchTimer = window.setTimeout(() => {
      this.#searchTimer = null;
      this.#runScheduledSearchDispatch();
    }, AbeyTableElement.searchDebounceMs);
    this.dispatchEvent(
      new CustomEvent("searchchange", {
        detail: { query: this.#query },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #emitSelectionChange() {
    const selectedItems: Row[] = [];
    for (const id of this.#selected) {
      const row = this.#rowByIdAll.get(id) ?? this.#rowById.get(id);
      if (row != null) selectedItems.push(row);
    }
    this.#config?.onSelectionChange?.(this.#selected);
    this.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: { selectedIds: this.#selected, selectedItems },
        bubbles: true,
        composed: true,
      }),
    );

    // flow intent (optional)
    if (this.#flowEnabled && this.#intentSelection) {
      const runtime = this.#getRuntime();
      if (runtime?.dispatch) {
        try {
          void runtime.dispatch(
            intentOf(this.#intentSelection, { selectedIds: Array.from(this.#selected) }),
            { source: "abey-table" },
          );
        } catch {
          /* ignore */
        }
      }
    }
  }

  #closeMenu() {
    this.#openMenuForRowId = null;
    this.#menuPortal?.remove();
    this.#menuPortal = null;
  }

  #openMenu(rowId: string) {
    const cfg = this.#config;
    if (!cfg) return;
    const row = this.#rowById.get(rowId);
    if (!row) return;

    this.#closeMenu();
    this.#openMenuForRowId = rowId;

    const anchorBtn = this.querySelector(`button[data-row-id="${CSS.escape(rowId)}"]`) as HTMLButtonElement | null;
    if (!anchorBtn) return;

    const actions = (cfg.rowActions?.(row) ?? cfg.actions ?? []).slice();
    if (!actions.length) return;

    const menu = el("div", { class: "menu abey-table-menu", role: "menu", "data-abey-menu": "1" });
    const rect = anchorBtn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    // align to button right edge; keep a reasonable min width from CSS
    menu.style.left = `${Math.max(8, Math.round(rect.right - 190))}px`;
    menu.style.right = "auto";
    menu.style.zIndex = "2147483647";
    for (const a of actions) {
      const item = el("button", { type: "button", role: "menuitem" }, [a.label]) as HTMLButtonElement;
      item.disabled = a.disabled?.(row) ?? false;
      item.addEventListener("click", (ev) => {
        this.#closeMenu();
        const clickEv = new CustomEvent("actionClick", {
          detail: { actionId: a.id, rowId, row },
          bubbles: true,
          composed: true,
          cancelable: true,
        });
        this.dispatchEvent(clickEv);
        if (clickEv.defaultPrevented) return;

        if (this.#flowEnabled && this.#intentAction) {
          const runtime = this.#getRuntime();
          if (runtime?.dispatch) {
            try {
              void runtime.dispatch(intentOf(this.#intentAction, { actionId: a.id, rowId }), { source: "abey-table" });
            } catch {
              /* ignore */
            }
          }
        }
        if (a.onSelect) {
          a.onSelect(row, { ev, table: this });
        } else {
          const eventName = a.eventName ?? "action";
          this.dispatchEvent(
            new CustomEvent(eventName, {
              detail: { actionId: a.id, rowId, row },
              bubbles: true,
              composed: true,
            }),
          );
        }
      });
      menu.append(item);
    }
    document.body.append(menu);
    this.#menuPortal = menu;
  }

  #onClick(ev: Event) {
    const t = ev.target as HTMLElement | null;
    if (!t) return;
    const btn = t.closest("button[data-row-id]") as HTMLButtonElement | null;
    if (!btn) return;
    const rowId = btn.dataset.rowId ?? null;
    if (!rowId) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (this.#openMenuForRowId === rowId) this.#closeMenu();
    else this.#openMenu(rowId);
  }

  #onDocClick(ev: Event) {
    if (!this.#openMenuForRowId) return;
    const path = (ev as any).composedPath?.() as Array<unknown> | undefined;
    const clickedInside = path ? path.includes(this) : this.contains(ev.target as Node);
    if (clickedInside) return;
    this.#closeMenu();
  }
}
