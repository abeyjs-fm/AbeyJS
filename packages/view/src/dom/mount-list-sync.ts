import type { Unsubscribe } from "@abeyjs/core";
import type { StateCell } from "@abeyjs/state";
import type { ListViewDef, ListSlice } from "../view-types.js";
import { applyViewTheme, type ViewTheme } from "../view-theme.js";

type RowId = string;

type RowBinding = {
  tr: HTMLTableRowElement;
  /** Nodo de texto por campo (hoja estable). */
  cells: Map<string, Text>;
  hasAction: boolean;
};

function applyActionButtonStyle(btn: HTMLButtonElement, label: string): void {
  const normalized = label.trim().toLowerCase();
  btn.classList.remove("abey-btn--success", "abey-btn--danger");
  if (normalized.includes("edit")) {
    btn.classList.add("abey-btn--success");
    return;
  }
  if (normalized.includes("elim") || normalized.includes("delet") || normalized.includes("borrar")) {
    btn.classList.add("abey-btn--danger");
  }
}

/**
 * Listado con **reconciliación por fila/celda**: actualiza solo nodos de texto que
 * cambian; reordena/crea/elimina `tr` según `rowKey`. Ráfagas de `StateCell` se
 * fusionan a un `requestAnimationFrame` por frame.
 */
export function mountListViewSync<TView>(
  root: HTMLElement,
  def: ListViewDef,
  cell: StateCell<Record<string, unknown>>,
  select: (s: TView) => ListSlice<Record<string, unknown>>,
  options: {
    onRowAction?: (row: Record<string, unknown>) => void;
    rowActionLabel?: string;
    /** Si se define, sustituye el par `onRowAction` / `rowActionLabel` (varios botones en la misma columna). */
    rowActions?: { label: string; onClick: (row: Record<string, unknown>) => void }[];
    onPageChange?: (page: number, pageSize: number) => void;
    theme?: ViewTheme;
  } = {},
): Unsubscribe {
  const PAGE_SIZE = 10;
  let currentPage = 1;
  let lastRowsCount = 0;

  const section = document.createElement("section");
  applyViewTheme(section, options.theme, "abey-list");
  const h2 = document.createElement("h2");
  h2.className = "abey-list__title";
  h2.textContent = def.title;
  const bodyWrap = document.createElement("div");
  bodyWrap.className = "abey-list__table-wrap";
  section.appendChild(h2);
  section.appendChild(bodyWrap);
  root.appendChild(section);

  const table = document.createElement("table");
  table.className = "abey-list__table";
  const thead = document.createElement("thead");
  const thr = document.createElement("tr");
  for (const f of def.fields) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = f.label;
    thr.appendChild(th);
  }
  const legacy = options.onRowAction
    ? [
        {
          label: options.rowActionLabel ?? "Abrir",
          onClick: (r: Record<string, unknown>) => {
            options.onRowAction?.(r);
          },
        },
      ]
    : [];
  const rowActionDefs =
    (options.rowActions && options.rowActions.length > 0) ? options.rowActions : options.onRowAction ? legacy : [];
  if (rowActionDefs.length > 0) {
    const thA = document.createElement("th");
    thA.scope = "col";
    thA.className = "abey-list__th-actions";
    thA.textContent = "Acciones";
    thr.appendChild(thA);
  }
  thead.appendChild(thr);
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);
  bodyWrap.appendChild(table);
  const pager = document.createElement("div");
  pager.className = "abey-list__pager";
  section.appendChild(pager);

  const rowMap = new Map<RowId, RowBinding>();
  let rafId = 0;
  const sync = (): void => {
    const slice = select(cell.get() as TView);
    const serverPaging = slice.serverPaging === true;
    const pageSize = slice.pageSize && slice.pageSize > 0 ? slice.pageSize : PAGE_SIZE;
    const totalRows = serverPaging ? (slice.total ?? slice.rows.length) : slice.rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    if (serverPaging) {
      currentPage = Math.max(1, slice.page ?? 1);
    }
    if (totalRows !== lastRowsCount) {
      if (!serverPaging) {
        currentPage = 1;
      }
      lastRowsCount = totalRows;
    }
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const renderPager = (): void => {
      pager.textContent = "";
      if (slice.status !== "ready" || totalRows <= PAGE_SIZE) {
        pager.style.display = "none";
        return;
      }
      pager.style.display = "";
      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "abey-btn abey-btn--sm";
      prev.textContent = "Anterior";
      prev.disabled = currentPage <= 1;
      prev.onclick = () => {
        if (currentPage <= 1) {
          return;
        }
        if (serverPaging) {
          options.onPageChange?.(currentPage - 1, pageSize);
          return;
        }
        currentPage -= 1;
        sync();
      };
      const info = document.createElement("span");
      info.className = "abey-list__pager-info";
      info.textContent = `Página ${currentPage} de ${totalPages} (${totalRows} registros)`;
      const next = document.createElement("button");
      next.type = "button";
      next.className = "abey-btn abey-btn--sm";
      next.textContent = "Siguiente";
      next.disabled = currentPage >= totalPages;
      next.onclick = () => {
        if (currentPage >= totalPages) {
          return;
        }
        if (serverPaging) {
          options.onPageChange?.(currentPage + 1, pageSize);
          return;
        }
        currentPage += 1;
        sync();
      };
      pager.appendChild(prev);
      pager.appendChild(info);
      pager.appendChild(next);
    };

    if (slice.status === "loading") {
      clearDataRows(tbody, rowMap);
      const tr = document.createElement("tr");
      tr.className = "abey-list__status-row";
      const td = document.createElement("td");
      td.className = "abey-list__status";
      td.colSpan = def.fields.length + (rowActionDefs.length > 0 ? 1 : 0);
      td.textContent = "…";
      tr.appendChild(td);
      tbody.appendChild(tr);
      renderPager();
      return;
    }
    if (slice.status === "error") {
      clearDataRows(tbody, rowMap);
      const tr = document.createElement("tr");
      tr.className = "abey-list__status-row";
      const td = document.createElement("td");
      td.className = "abey-list__status";
      td.colSpan = def.fields.length + (rowActionDefs.length > 0 ? 1 : 0);
      td.setAttribute("role", "alert");
      td.textContent = slice.errorMessage ?? "Error";
      tr.appendChild(td);
      tbody.appendChild(tr);
      renderPager();
      return;
    }
    removeStatusOnlyRows(tbody);
    const pageStart = (currentPage - 1) * pageSize;
    const pageRows = serverPaging ? slice.rows : slice.rows.slice(pageStart, pageStart + pageSize);
    reconcileTbody(def, tbody, rowMap, pageRows, rowActionDefs);
    renderPager();
  };

  const schedule = (): void => {
    if (rafId !== 0) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      sync();
    });
  };

  const unsub = cell.subscribe(schedule);
  schedule();

  return () => {
    unsub();
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}

function clearDataRows(tbody: HTMLTableSectionElement, rowMap: Map<RowId, RowBinding>): void {
  for (const b of rowMap.values()) {
    b.tr.remove();
  }
  rowMap.clear();
  for (const c of Array.from(tbody.children)) {
    c.remove();
  }
}

function removeStatusOnlyRows(tbody: HTMLTableSectionElement): void {
  for (const tr of Array.from(tbody.querySelectorAll("tr.abey-list__status-row"))) {
    tr.remove();
  }
}

function reconcileTbody(
  def: ListViewDef,
  tbody: HTMLTableSectionElement,
  rowMap: Map<RowId, RowBinding>,
  rows: Record<string, unknown>[],
  rowActionDefs: { label: string; onClick: (row: Record<string, unknown>) => void }[],
): void {
  const k = def.rowKey;
  const nextIds: RowId[] = [];
  for (const row of rows) {
    const raw = row[k as keyof typeof row];
    if (raw === null || raw === undefined) {
      throw new Error(`@abeyjs/view mountListViewSync: falta ${k} (rowKey) en una fila.`);
    }
    nextIds.push(String(raw));
  }

  const nextSet = new Set(nextIds);
  for (const [id, b] of rowMap) {
    if (!nextSet.has(id)) {
      b.tr.remove();
      rowMap.delete(id);
    }
  }

  for (const row of rows) {
    const id = String((row as Record<string, unknown>)[k] as string);
    let b = rowMap.get(id);
    if (!b) {
      b = buildRowBinding(def, row, id, rowActionDefs);
      rowMap.set(id, b);
    } else {
      updateRowCells(def, b, row, rowActionDefs);
    }
  }
  for (const id of nextIds) {
    const b = rowMap.get(id);
    if (b) {
      tbody.appendChild(b.tr);
    }
  }
}

function buildRowBinding(
  def: ListViewDef,
  row: Record<string, unknown>,
  id: RowId,
  rowActionDefs: { label: string; onClick: (row: Record<string, unknown>) => void }[],
): RowBinding {
  const tr = document.createElement("tr");
  tr.dataset.rowId = id;
  const cells = new Map<string, Text>();
  for (const f of def.fields) {
    const td = document.createElement("td");
    td.dataset.label = f.label;
    const t = document.createTextNode(formatCell((row as Record<string, unknown>)[f.name]));
    td.appendChild(t);
    tr.appendChild(td);
    cells.set(f.name, t);
  }
  if (rowActionDefs.length > 0) {
    const td = document.createElement("td");
    td.className = "abey-list__actions";
    td.dataset.label = "Acciones";
    for (const a of rowActionDefs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "abey-btn abey-btn--sm";
      btn.textContent = a.label;
      applyActionButtonStyle(btn, a.label);
      const r0 = { ...(row as Record<string, unknown>) };
      btn.addEventListener("click", () => a.onClick(r0));
      td.appendChild(btn);
    }
    tr.appendChild(td);
  }
  return { tr, cells, hasAction: rowActionDefs.length > 0 };
}

function updateRowCells(
  def: ListViewDef,
  b: RowBinding,
  row: Record<string, unknown>,
  rowActionDefs: { label: string; onClick: (row: Record<string, unknown>) => void }[],
): void {
  for (const f of def.fields) {
    const t = b.cells.get(f.name);
    if (t) {
      const next = formatCell((row as Record<string, unknown>)[f.name]);
      if (t.data !== next) {
        t.data = next;
      }
    }
  }
  if (b.hasAction && rowActionDefs.length > 0) {
    const lastTd = b.tr.querySelector("td.abey-list__actions");
    if (lastTd) {
      const r = { ...(row as Record<string, unknown>) };
      const buttons = lastTd.querySelectorAll("button");
      for (let i = 0; i < rowActionDefs.length; i++) {
        const a = rowActionDefs[i];
        const btn = buttons[i];
        if (btn) {
          btn.textContent = a.label;
          applyActionButtonStyle(btn as HTMLButtonElement, a.label);
          btn.onclick = () => a.onClick({ ...r });
        }
      }
    }
  }
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) {
    return "";
  }
  if (typeof v === "object") {
    return JSON.stringify(v);
  }
  return String(v);
}
