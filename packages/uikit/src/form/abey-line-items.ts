import type { LineItemsColumnDef } from "./mount-line-items-table.js";
import type { LineItemsEmptyRowOptions } from "./line-items-generated.js";
import { createLineItemsEmptyRow } from "./line-items-generated.js";
import type { AbeyFormElement } from "./abey-form-impl.js";

export type AbeyLineItemsConfig = {
  name?: string;
  columns: LineItemsColumnDef[];
  emptyRow?: LineItemsEmptyRowOptions;
  blockClass?: string;
  addRowLabel?: string;
  ariaLabel?: string;
};

function coerceCell(col: LineItemsColumnDef, raw: string): string | number {
  if (col.kind === "number") {
    const v = raw.trim() === "" ? 0 : Number(raw);
    return Number.isFinite(v) ? v : 0;
  }
  return raw;
}

function validateCell(col: LineItemsColumnDef, v: unknown): string | null {
  const s = v == null ? "" : String(v);
  if (col.kind === "number") {
    const n = typeof v === "number" ? v : Number(s);
    if (!Number.isFinite(n)) return "Número inválido";
    if (col.rule === "min1" && !(n >= 1)) return "Mínimo 1";
    if (col.rule === "positive" && !(n > 0)) return "Debe ser > 0";
    if (col.rule === "nonNegative" && !(n >= 0)) return "Debe ser ≥ 0";
    return null;
  }
  if (col.required && s.trim().length === 0) return "Obligatorio";
  if (col.rule === "min1" && s.trim().length === 0) return "Obligatorio";
  return null;
}

export class AbeyLineItemsElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      "name",
      "blockclass",
      "addrowlabel",
      "arialabel",
      "columns-json",
      "empty-row-json",
    ];
  }

  #cfg: AbeyLineItemsConfig | null = null;
  #columns: LineItemsColumnDef[] = [];
  #emptyRow: LineItemsEmptyRowOptions | undefined;
  #name = "items";
  #block = "abey-line-items";
  #aria = "Líneas del documento";
  #addLabel = "Agregar línea";

  #tbody: HTMLTableSectionElement | null = null;
  #form: AbeyFormElement | null = null;
  #suppressStoreChange = false;

  set config(v: AbeyLineItemsConfig | null) {
    this.#cfg = v;
    if (v) {
      this.#columns = v.columns ?? [];
      this.#emptyRow = v.emptyRow;
      if (v.name) this.#name = v.name;
      if (v.blockClass) this.#block = v.blockClass;
      if (v.ariaLabel) this.#aria = v.ariaLabel;
      if (v.addRowLabel) this.#addLabel = v.addRowLabel;
    }
    if (this.isConnected) this.#render();
  }

  get config(): AbeyLineItemsConfig | null {
    return this.#cfg;
  }

  set columns(v: LineItemsColumnDef[]) {
    this.#columns = Array.isArray(v) ? v : [];
    if (this.isConnected) this.#render();
  }

  get columns(): LineItemsColumnDef[] {
    return this.#columns;
  }

  set emptyRow(v: LineItemsEmptyRowOptions | undefined) {
    this.#emptyRow = v;
  }

  get emptyRow(): LineItemsEmptyRowOptions | undefined {
    return this.#emptyRow;
  }

  get name(): string {
    return this.#name;
  }

  set name(v: string) {
    this.#name = v.trim() || "items";
    if (this.isConnected) this.#render();
  }

  connectedCallback(): void {
    this.#readAttrs();
    this.classList.add(this.#block);
    this.#form = this.closest("abey-form") as AbeyFormElement | null;
    this.addEventListener("click", this.#onClick);
    this.addEventListener("input", this.#onInput, { capture: true });

    // Sync con reset y cambios de store.
    this.#form?.addEventListener(
      "abeyformreset",
      this.#onFormReset as EventListener,
    );
    this.#form?.addEventListener(
      "abeyformstorechange",
      this.#onStoreChange as EventListener,
    );
    this.#render();

    // Si el host se mueve a un tabpanel después (autoslot), re-intentar enlace al <abey-form>.
    queueMicrotask(() => {
      if (!this.isConnected) return;
      if (!this.#form) {
        this.#form = this.closest("abey-form") as AbeyFormElement | null;
        this.#form?.addEventListener(
          "abeyformreset",
          this.#onFormReset as EventListener,
        );
        this.#form?.addEventListener(
          "abeyformstorechange",
          this.#onStoreChange as EventListener,
        );
      }
      this.#render();
    });
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("input", this.#onInput, {
      capture: true,
    } as AddEventListenerOptions);
    this.#form?.removeEventListener(
      "abeyformreset",
      this.#onFormReset as EventListener,
    );
    this.#form?.removeEventListener(
      "abeyformstorechange",
      this.#onStoreChange as EventListener,
    );
    this.#form = null;
  }

  attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    this.#readAttrs();
    if (this.isConnected) this.#render();
  }

  static define(tagName = "abey-line-items"): void {
    if (!customElements.get(tagName)) {
      customElements.define(
        tagName,
        AbeyLineItemsElement as CustomElementConstructor,
      );
    }
  }

  #readAttrs(): void {
    const n = (this.getAttribute("name") ?? "").trim();
    if (n) this.#name = n;
    const b = (this.getAttribute("blockclass") ?? "").trim();
    if (b) this.#block = b;
    const a = (this.getAttribute("arialabel") ?? "").trim();
    if (a) this.#aria = a;
    const add = (this.getAttribute("addrowlabel") ?? "").trim();
    if (add) this.#addLabel = add;

    const colsJson = (this.getAttribute("columns-json") ?? "").trim();
    if (colsJson) {
      try {
        const parsed = JSON.parse(colsJson) as unknown;
        if (Array.isArray(parsed)) {
          this.#columns = parsed as LineItemsColumnDef[];
        }
      } catch {
        /* ignore invalid JSON */
      }
    }
    const emptyJson = (this.getAttribute("empty-row-json") ?? "").trim();
    if (emptyJson) {
      try {
        this.#emptyRow = JSON.parse(emptyJson) as LineItemsEmptyRowOptions;
      } catch {
        /* ignore invalid JSON */
      }
    }
  }

  #ensureItems(): Record<string, unknown>[] {
    if (!this.#form) return [];
    const raw = this.#form.getStoreValue(this.#name);
    const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    if (arr.length > 0) return arr;
    const empty = createLineItemsEmptyRow(this.#columns, this.#emptyRow);
    const next = [empty];
    this.#form.setStoreValue(this.#name, next);
    return next;
  }

  #setItems(items: Record<string, unknown>[]): void {
    if (!this.#form) return;
    this.#form.setStoreValue(this.#name, items);
  }

  #render(): void {
    // Re-evaluar form host (puede cambiar por autoslot en tabs).
    if (!this.#form) {
      this.#form = this.closest("abey-form") as AbeyFormElement | null;
    }
    // Debug-friendly fallbacks: avoid rendering "nothing" silently.
    if (!this.#columns.length) {
      this.setAttribute("data-abey-line-items", "no-columns");
      this.textContent =
        "abey-line-items: falta `columns-json` (o JSON inválido).";
      return;
    }
    this.setAttribute("data-abey-line-items", "ready");

    const block = this.#block.trim() || "abey-line-items";
    this.className = block;

    if (!this.#form) {
      this.setAttribute("data-abey-line-items", "no-form");
      this.textContent = "abey-line-items: debe estar dentro de <abey-form>.";
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = `${block}__wrap`;

    const table = document.createElement("table");
    table.className = `${block}__table`;
    table.setAttribute("aria-label", this.#aria);

    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    for (const col of this.#columns) {
      const th = document.createElement("th");
      th.textContent = col.label;
      hr.appendChild(th);
    }
    const thAct = document.createElement("th");
    thAct.setAttribute("aria-label", "Acciones");
    hr.appendChild(thAct);
    thead.appendChild(hr);

    const tbody = document.createElement("tbody");
    this.#tbody = tbody;

    table.appendChild(thead);
    table.appendChild(tbody);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = `${block}__add`;
    addBtn.dataset.abeyLineAction = "add";
    addBtn.textContent = this.#addLabel;

    wrap.appendChild(table);
    wrap.appendChild(addBtn);

    this.replaceChildren(wrap);

    this.#renderBody(this.#ensureItems());
  }

  #renderBody(rows: Record<string, unknown>[]): void {
    const tbody = this.#tbody;
    if (!tbody) return;
    const block = this.#block.trim() || "abey-line-items";
    tbody.replaceChildren();
    rows.forEach((row, i) => {
      tbody.appendChild(this.#buildRow(i, row, block));
    });
  }

  #buildRow(
    trIndex: number,
    row: Record<string, unknown>,
    block: string,
  ): HTMLTableRowElement {
    const tr = document.createElement("tr");
    tr.dataset.itemRow = "1";
    tr.dataset.rowIndex = String(trIndex);

    for (const col of this.#columns) {
      const td = document.createElement("td");
      const v = row[col.name];
      const err = validateCell(col, v);
      if (err) td.dataset.invalid = "1";

      if (col.kind === "textarea") {
        const ta = document.createElement("textarea");
        ta.className = `${block}__textarea`;
        ta.dataset.field = col.name;
        ta.rows = 2;
        ta.value = v === undefined || v === null ? "" : String(v);
        if (err) ta.setAttribute("aria-invalid", "true");
        td.appendChild(ta);
      } else {
        const inp = document.createElement("input");
        inp.type = col.kind === "number" ? "number" : "text";
        inp.dataset.field = col.name;
        inp.className = `${block}__input`;
        inp.value = v === undefined || v === null ? "" : String(v);
        if (col.kind === "number") inp.step = "any";
        if (err) inp.setAttribute("aria-invalid", "true");
        td.appendChild(inp);
      }
      tr.appendChild(td);
    }

    const tdAct = document.createElement("td");
    const del = document.createElement("button");
    del.type = "button";
    del.className = `${block}__del`;
    del.dataset.abeyLineAction = "del";
    del.setAttribute("aria-label", "Eliminar línea");
    del.textContent = "×";
    tdAct.appendChild(del);
    tr.appendChild(tdAct);

    return tr;
  }

  #collect(): Record<string, unknown>[] {
    const tbody = this.#tbody;
    if (!tbody) return [];
    const out: Record<string, unknown>[] = [];
    const rowsEls = Array.from(
      tbody.querySelectorAll<HTMLTableRowElement>("tr[data-item-row]"),
    );
    for (const tr of rowsEls) {
      const row: Record<string, unknown> = {};
      for (const col of this.#columns) {
        const el = tr.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          `[data-field="${col.name}"]`,
        );

        let raw: unknown = "";
        if (el && "type" in el && el.type === "checkbox") {
          raw = (el as HTMLInputElement).checked;
        } else if (el && "type" in el && el.type === "radio") {
          const checkedRadio = tr.querySelector<HTMLInputElement>(
            `input[data-field="${col.name}"]:checked`,
          );
          raw = checkedRadio?.value ?? "";
        } else {
          raw = el?.value ?? "";
        }

        row[col.name] = coerceCell(col, String(raw));
      }
      out.push(row);
    }
    return out;
  }

  #onClick = (ev: MouseEvent): void => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest<HTMLButtonElement>("button[data-abey-line-action]");
    if (!btn) return;
    const action = btn.dataset.abeyLineAction;
    if (action === "add") {
      const next = this.#collect();
      next.push(createLineItemsEmptyRow(this.#columns, this.#emptyRow));
      this.#suppressStoreChange = true;
      this.#setItems(next);
      queueMicrotask(() => {
        this.#suppressStoreChange = false;
      });
      this.#renderBody(next);
      return;
    }
    if (action === "del") {
      const tr = btn.closest("tr");
      if (!(tr instanceof HTMLTableRowElement) || !this.#tbody?.contains(tr))
        return;
      const rowsEls = Array.from(
        this.#tbody.querySelectorAll<HTMLTableRowElement>("tr[data-item-row]"),
      );
      const idx = rowsEls.indexOf(tr);
      const items = this.#collect();
      items.splice(idx, 1);
      const normalized = items.length
        ? items
        : [createLineItemsEmptyRow(this.#columns, this.#emptyRow)];
      this.#suppressStoreChange = true;
      this.#setItems(normalized);
      queueMicrotask(() => {
        this.#suppressStoreChange = false;
      });
      this.#renderBody(normalized);
    }
  };

  #onInput = (ev: Event): void => {
    const t = ev.target;
    if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement))
      return;
    if (!t.dataset.field) return;
    // snapshot simple: en inputs de tabla, sync al store
    const items = this.#collect();
    this.#suppressStoreChange = true;
    this.#setItems(items);
    queueMicrotask(() => {
      this.#suppressStoreChange = false;
    });
  };

  #onFormReset = (): void => {
    // al reset del form, el store extra pudo borrarse; asegurar fila vacía
    const rows = this.#ensureItems();
    this.#renderBody(rows);
  };

  #onStoreChange = (ev: Event): void => {
    if (this.#suppressStoreChange) return;
    const ce = ev as CustomEvent<{ path?: string }>;
    const path = (ce.detail?.path ?? "").trim();
    if (!path) return;
    if (path === this.#name || path.startsWith(`${this.#name}.`)) {
      const rows = Array.isArray(this.#form?.getStoreValue(this.#name))
        ? (this.#form?.getStoreValue(this.#name) as Record<string, unknown>[])
        : [];
      const normalized = rows.length
        ? rows
        : [createLineItemsEmptyRow(this.#columns, this.#emptyRow)];
      if (!rows.length) this.#setItems(normalized);
      this.#renderBody(normalized);
    }
  };
}
