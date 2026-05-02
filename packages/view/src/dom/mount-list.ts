import type { Unsubscribe } from "@abeyjs/core";
import type { StateCell } from "@abeyjs/state";
import type { ListViewDef, ListSlice } from "../view-types.js";
import { applyViewTheme, type ViewTheme } from "../view-theme.js";

/**
 * Suscribe a `cell` y pinta una tabla declarativa en `root`. Sin framework de UI.
 */
export function mountListView<TView>(
  root: HTMLElement,
  def: ListViewDef,
  cell: StateCell<Record<string, unknown>>,
  select: (s: TView) => ListSlice<Record<string, unknown>>,
  options: {
    onRowAction?: (row: Record<string, unknown>) => void;
    rowActionLabel?: string;
    theme?: ViewTheme;
  } = {},
): Unsubscribe {
  const ui = createListUI(def, options);
  root.replaceChildren(ui.section);

  const render = (): void => {
    const state = select(cell.get() as TView);
    ui.update(state);
  };
  render();
  const unsub = cell.subscribe(render);
  return (): void => {
    unsub();
    ui.dispose();
  };
}

function createListUI(
  def: ListViewDef,
  options: { onRowAction?: (row: Record<string, unknown>) => void; rowActionLabel?: string; theme?: ViewTheme },
): {
  section: HTMLElement;
  update: (slice: ListSlice<Record<string, unknown>>) => void;
  dispose: () => void;
} {
  const section = document.createElement("section");
  applyViewTheme(section, options.theme, "abey-list");
  const h2 = document.createElement("h2");
  h2.className = "abey-list__title";
  h2.textContent = def.title;
  section.appendChild(h2);
  const wrap = document.createElement("div");
  wrap.className = "abey-list__table-wrap";
  section.appendChild(wrap);
  const table = document.createElement("table");
  table.className = "abey-list__table";
  wrap.appendChild(table);
  const thead = document.createElement("thead");
  const thr = document.createElement("tr");
  for (const f of def.fields) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = f.label;
    thr.appendChild(th);
  }
  const hasRowAction = Boolean(options.onRowAction);
  if (hasRowAction) {
    const thA = document.createElement("th");
    thA.scope = "col";
    thr.appendChild(thA);
  }
  thead.appendChild(thr);
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);

  const statusRow = document.createElement("tr");
  statusRow.className = "abey-list__status-row";
  const statusCell = document.createElement("td");
  statusCell.className = "abey-list__status";
  statusCell.colSpan = Math.max(1, def.fields.length + (hasRowAction ? 1 : 0));
  statusRow.appendChild(statusCell);

  const rowById = new Map<string, HTMLTableRowElement>();
  const lastRowDataById = new Map<string, Record<string, unknown>>();

  const onBodyClick = (ev: MouseEvent): void => {
    if (!options.onRowAction) {
      return;
    }
    const t = ev.target;
    if (!(t instanceof Element)) {
      return;
    }
    const btn = t.closest("button[data-abey-row-action]") as HTMLButtonElement | null;
    if (!btn || !tbody.contains(btn)) {
      return;
    }
    const tr = btn.closest("tr[data-row-id]") as HTMLTableRowElement | null;
    if (!tr) {
      return;
    }
    const id = tr.dataset.rowId;
    if (!id) {
      return;
    }
    const row = lastRowDataById.get(id);
    if (row) {
      options.onRowAction(row);
    }
  };
  tbody.addEventListener("click", onBodyClick);

  const setStatus = (kind: "loading" | "error", message: string): void => {
    tbody.replaceChildren(statusRow);
    statusCell.textContent = message;
    if (kind === "error") {
      statusCell.setAttribute("role", "alert");
    } else {
      statusCell.removeAttribute("role");
    }
    rowById.clear();
    lastRowDataById.clear();
  };

  const ensureRow = (id: string): HTMLTableRowElement => {
    const existing = rowById.get(id);
    if (existing) {
      return existing;
    }
    const tr = document.createElement("tr");
    tr.dataset.rowId = id;
    for (const _ of def.fields) {
      tr.appendChild(document.createElement("td"));
    }
    if (hasRowAction) {
      const td = document.createElement("td");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "abey-btn abey-btn--sm";
      btn.textContent = options.rowActionLabel ?? "Abrir";
      btn.dataset.abeyRowAction = "true";
      td.appendChild(btn);
      tr.appendChild(td);
    }
    rowById.set(id, tr);
    return tr;
  };

  const patchRowCells = (tr: HTMLTableRowElement, row: Record<string, unknown>): void => {
    for (let i = 0; i < def.fields.length; i += 1) {
      const f = def.fields[i]!;
      const td = tr.children.item(i) as HTMLTableCellElement | null;
      if (!td) continue;
      const v = row[f.name as keyof typeof row];
      const next = format(v);
      if (td.textContent !== next) {
        td.textContent = next;
      }
    }
  };

  const update = (slice: ListSlice<Record<string, unknown>>): void => {
    if (slice.status === "loading") {
      setStatus("loading", "…");
      return;
    }
    if (slice.status === "error") {
      setStatus("error", slice.errorMessage ?? "Error");
      return;
    }
    const nextIds = new Set<string>();
    const frag = document.createDocumentFragment();
    for (const row of slice.rows) {
      const raw = (row as Record<string, unknown>)[def.rowKey as keyof typeof row];
      const id = raw === null || raw === undefined ? "" : String(raw);
      if (!id) continue;
      nextIds.add(id);
      const tr = ensureRow(id);
      patchRowCells(tr, row);
      lastRowDataById.set(id, row);
      frag.appendChild(tr);
    }
    for (const id of Array.from(rowById.keys())) {
      if (!nextIds.has(id)) {
        rowById.delete(id);
        lastRowDataById.delete(id);
      }
    }
    tbody.replaceChildren(frag);
  };

  return {
    section,
    update,
    dispose: () => {
      tbody.removeEventListener("click", onBodyClick);
      rowById.clear();
      lastRowDataById.clear();
    },
  };
}

function format(v: unknown): string {
  if (v === null || v === undefined) {
    return "";
  }
  if (typeof v === "object") {
    return JSON.stringify(v);
  }
  return String(v);
}
