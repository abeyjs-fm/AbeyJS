/**
 * Tabla de líneas editable (documento / pedido) para host dentro de `<abey-form>` o pestañas.
 * Paridad de idea con el ejemplo invoice; API estable para no copiar DOM a mano en cada app.
 */

export type LineItemsColumnKind = "text" | "number" | "textarea";

export type LineItemsColumnRule = "min1" | "positive" | "nonNegative";

export type LineItemsColumnDef = {
  name: string;
  label: string;
  kind: LineItemsColumnKind;
  /**
   * Validación declarativa (para generar Zod en el agente).
   * - `required`: para texto/textarea (min 1 char). En números normalmente se expresa con `rule`.
   * - `rule`: reglas comunes para líneas de documentos.
   */
  required?: boolean;
  rule?: LineItemsColumnRule;
};

export type LineItemsTableController<TRow = Record<string, unknown>> = {
  getRows(): TRow[];
  setRows(rows: TRow[]): void;
  dispose(): void;
};

export type MountLineItemsTableOptions<TRow = Record<string, unknown>> = {
  host: HTMLElement;
  columns: LineItemsColumnDef[];
  initialRows: TRow[];
  /**
   * Bloque BEM: `{{block}}`, `{{block}}__wrap`, `{{block}}__table`, …
   * Incluí en tu tema las reglas para ese bloque o usá el default `abey-line-items` (omega-default.css).
   */
  blockClass?: string;
  addRowLabel?: string;
  ariaLabel?: string;
  /**
   * Fila por defecto al agregar o cuando no queda ninguna fila.
   * Por defecto: `number` → 0, `text`/`textarea` → `""`.
   */
  createEmptyRow?: (columns: LineItemsColumnDef[]) => TRow;
};

function defaultEmptyRow(columns: LineItemsColumnDef[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    row[col.name] = col.kind === "number" ? 0 : "";
  }
  return row;
}

function coerceCell(col: LineItemsColumnDef, raw: string): string | number {
  if (col.kind === "number") {
    const v = raw.trim() === "" ? 0 : Number(raw);
    return Number.isFinite(v) ? v : 0;
  }
  return raw;
}

function readRowFromTr(tr: HTMLTableRowElement, columns: LineItemsColumnDef[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    const el = tr.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${col.name}"]`);
    const raw = el?.value ?? "";
    row[col.name] = coerceCell(col, raw);
  }
  return row;
}

function buildRow(
  trIndex: number,
  columns: LineItemsColumnDef[],
  row: Record<string, unknown>,
  block: string,
): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.dataset.itemRow = "1";
  tr.dataset.rowIndex = String(trIndex);

  for (const col of columns) {
    const td = document.createElement("td");
    const v = row[col.name];
    if (col.kind === "textarea") {
      const ta = document.createElement("textarea");
      ta.className = `${block}__textarea`;
      ta.dataset.field = col.name;
      ta.rows = 2;
      ta.value = v === undefined || v === null ? "" : String(v);
      td.appendChild(ta);
    } else {
      const inp = document.createElement("input");
      inp.type = col.kind === "number" ? "number" : "text";
      inp.dataset.field = col.name;
      inp.className = `${block}__input`;
      inp.value = v === undefined || v === null ? "" : String(v);
      if (col.kind === "number") inp.step = "any";
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

/**
 * Monta una tabla de líneas con agregar/eliminar fila. Tipá `TRow` con la forma de tu documento
 * (validá con Zod en el agente).
 */
export function mountLineItemsTable<TRow = Record<string, unknown>>(
  o: MountLineItemsTableOptions<TRow>,
): LineItemsTableController<TRow> {
  const block = (o.blockClass ?? "abey-line-items").trim() || "abey-line-items";
  const { host, columns, initialRows } = o;
  const emptyFor: (columns: LineItemsColumnDef[]) => TRow =
    o.createEmptyRow ?? ((cols) => defaultEmptyRow(cols) as TRow);
  const aria = o.ariaLabel?.trim() || "Líneas del documento";
  const addLabel = o.addRowLabel?.trim() ? o.addRowLabel! : "Agregar línea";

  host.innerHTML = "";
  host.classList.add(block);

  const wrap = document.createElement("div");
  wrap.className = `${block}__wrap`;

  const table = document.createElement("table");
  table.className = `${block}__table`;
  table.setAttribute("aria-label", aria);

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col.label;
    hr.appendChild(th);
  }
  const thAct = document.createElement("th");
  thAct.setAttribute("aria-label", "Acciones");
  hr.appendChild(thAct);
  thead.appendChild(hr);

  const tbody = document.createElement("tbody");

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = `${block}__add`;
  addBtn.dataset.abeyLineAction = "add";
  addBtn.textContent = addLabel;

  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);
  wrap.appendChild(addBtn);
  host.appendChild(wrap);

  const renderBody = (rows: Record<string, unknown>[]): void => {
    tbody.replaceChildren();
    rows.forEach((row, i) => {
      tbody.appendChild(buildRow(i, columns, row, block));
    });
  };

  const firstRows: Record<string, unknown>[] = (
    initialRows.length ? initialRows : [emptyFor(columns)]
  ) as unknown as Record<string, unknown>[];
  renderBody(firstRows);

  const collect = (): Record<string, unknown>[] =>
    Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr[data-item-row]")).map((tr) =>
      readRowFromTr(tr, columns),
    );

  const onClick = (ev: MouseEvent): void => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest<HTMLButtonElement>("button[data-abey-line-action]");
    if (!btn) return;
    const action = btn.dataset.abeyLineAction;
    if (action === "add") {
      const next = collect();
      next.push(emptyFor(columns) as unknown as Record<string, unknown>);
      renderBody(next);
      return;
    }
    if (action === "del") {
      const tr = btn.closest("tr");
      if (!(tr instanceof HTMLTableRowElement) || !tbody.contains(tr)) return;
      const rowsEls = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr[data-item-row]"));
      const idx = rowsEls.indexOf(tr);
      const items = collect();
      items.splice(idx, 1);
      renderBody(
        items.length ? items : [emptyFor(columns) as unknown as Record<string, unknown>],
      );
    }
  };

  wrap.addEventListener("click", onClick);

  return {
    getRows: () => collect() as TRow[],
    setRows: (rows) => {
      const normalized: Record<string, unknown>[] = rows.length
        ? (rows as unknown as Record<string, unknown>[])
        : [emptyFor(columns) as unknown as Record<string, unknown>];
      renderBody(normalized);
    },
    dispose: () => {
      wrap.removeEventListener("click", onClick);
      host.replaceChildren();
      host.classList.remove(block);
    },
  };
}
