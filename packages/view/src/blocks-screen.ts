export type ToolbarSelect = {
  kind: "select";
  label: string;
  options?: string[];
};

export type ToolbarSearch = {
  kind: "search";
  placeholder: string;
};

export type ToolbarItem = ToolbarSelect | ToolbarSearch;

type ActionDef = {
  label: string;
  action: string;
  tone?: "default" | "danger";
};

type BaseColumn<Row> = {
  header?: string;
  className?: string;
  field?: keyof Row;
};

type CheckColumn<Row> = BaseColumn<Row> & { type: "check" };
type ProgressColumn<Row> = BaseColumn<Row> & { type: "progress"; field: keyof Row };
type StatusColumn<Row> = BaseColumn<Row> & { type: "status"; field: keyof Row };
type ActionsColumn<Row> = BaseColumn<Row> & { type: "actions"; actions: ActionDef[] };
type TextColumn<Row> = BaseColumn<Row> & { type?: "text"; header: string; field: keyof Row };
type CustomColumn<Row> = BaseColumn<Row> & {
  type?: "custom";
  header: string;
  cell: (row: Row, rowIndex: number) => string | number | HTMLElement;
};

export type DataTableColumn<Row> =
  | CheckColumn<Row>
  | ProgressColumn<Row>
  | StatusColumn<Row>
  | ActionsColumn<Row>
  | TextColumn<Row>
  | CustomColumn<Row>;

type DataSource<Row> =
  | Row[]
  | string
  | {
      name: string;
      load?: () => Row[];
    };

export type DataTableBlock<Row> = {
  kind: "dataTable";
  columns: DataTableColumn<Row>[];
  rows?: Row[];
  source?: DataSource<Row>;
  height?: string;
  pagination?: boolean;
  onAction?: (actionId: string, row: Row, rowIndex: number) => void;
};

export type ScreenSpec<Row> = {
  title: string;
  toolbar?: ToolbarItem[];
  body: DataTableBlock<Row>[];
};

const screenSourceRegistry = new Map<string, () => unknown[]>();

export function registerScreenSource<Row>(name: string, load: () => Row[]): void {
  screenSourceRegistry.set(name, load as () => unknown[]);
}

export function select(label: string, options: string[] = []): ToolbarSelect {
  return { kind: "select", label, options };
}

export function search(placeholder: string): ToolbarSearch {
  return { kind: "search", placeholder };
}

export function dataTable<Row>(config: Omit<DataTableBlock<Row>, "kind">): DataTableBlock<Row> {
  return { kind: "dataTable", ...config };
}

export function screen<Row>(config: ScreenSpec<Row>): ScreenSpec<Row> {
  return config;
}

function readCellField<Row>(row: Row, field: keyof Row | undefined): unknown {
  if (field === undefined) return "";
  return row[field];
}

function badgeClass(statusText: string): string {
  if (statusText.toLowerCase() === "done") return "abey-course-badge abey-course-badge--done";
  if (statusText.toLowerCase() === "paused") return "abey-course-badge abey-course-badge--paused";
  return "abey-course-badge abey-course-badge--ongoing";
}

function progressRing(value: unknown): HTMLElement {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  const safe = Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : 0;
  const ring = document.createElement("span");
  ring.className = "abey-course-ring";
  ring.style.setProperty("--p", `${safe}%`);
  const label = document.createElement("span");
  label.className = "abey-course-ring__label";
  label.textContent = `${safe}%`;
  ring.appendChild(label);
  return ring;
}

function renderToolbar(items: ToolbarItem[]): HTMLElement {
  const root = document.createElement("div");
  root.className = "abey-screen-toolbar";
  for (const item of items) {
    if (item.kind === "select") {
      const wrap = document.createElement("label");
      wrap.className = "abey-screen-toolbar__select-wrap";
      const text = document.createElement("span");
      text.className = "abey-screen-toolbar__hint";
      text.textContent = `${item.label}:`;
      const selectEl = document.createElement("select");
      selectEl.className = "abey-screen-toolbar__select";
      const opts = item.options && item.options.length > 0 ? item.options : ["All"];
      for (const opt of opts) {
        const node = document.createElement("option");
        node.value = opt;
        node.textContent = opt;
        selectEl.appendChild(node);
      }
      wrap.appendChild(text);
      wrap.appendChild(selectEl);
      root.appendChild(wrap);
      continue;
    }
    const searchWrap = document.createElement("label");
    searchWrap.className = "abey-screen-toolbar__search-wrap";
    const input = document.createElement("input");
    input.type = "search";
    input.className = "abey-screen-toolbar__search";
    input.placeholder = item.placeholder;
    searchWrap.appendChild(input);
    root.appendChild(searchWrap);
  }
  return root;
}

function resolveRows<Row>(block: DataTableBlock<Row>): Row[] {
  if (block.source === undefined) {
    return block.rows ?? [];
  }
  if (Array.isArray(block.source)) {
    return block.source;
  }
  if (typeof block.source === "string") {
    const fromRegistry = screenSourceRegistry.get(block.source);
    return fromRegistry ? (fromRegistry() as Row[]) : [];
  }
  if (block.source.load) {
    return block.source.load();
  }
  const fromRegistry = screenSourceRegistry.get(block.source.name);
  return fromRegistry ? (fromRegistry() as Row[]) : [];
}

function renderDataTable<Row>(block: DataTableBlock<Row>): HTMLElement {
  const rows = resolveRows(block);
  const wrap = document.createElement("div");
  wrap.className = "abey-courses__table-wrap abey-screen-table__wrap";
  if (block.height?.trim()) {
    wrap.style.maxHeight = block.height;
    wrap.style.overflow = "auto";
  }

  const table = document.createElement("table");
  table.className = "abey-courses__table abey-screen-table";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const col of block.columns) {
    const th = document.createElement("th");
    th.textContent = col.header ?? "";
    if (col.className) th.className = col.className;
    headRow.appendChild(th);
  }
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement("tbody");
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    for (const col of block.columns) {
      const td = document.createElement("td");
      if (col.className) td.classList.add(col.className);

      if (col.type === "check") {
        const check = document.createElement("input");
        check.type = "checkbox";
        const val = readCellField(row, col.field);
        check.checked = typeof val === "boolean" ? val : false;
        td.appendChild(check);
      } else if (col.type === "progress") {
        td.appendChild(progressRing(readCellField(row, col.field)));
      } else if (col.type === "status") {
        const badge = document.createElement("span");
        const raw = String(readCellField(row, col.field) ?? "");
        badge.className = badgeClass(raw);
        badge.textContent = raw;
        td.appendChild(badge);
      } else if (col.type === "actions") {
        const actionWrap = document.createElement("div");
        actionWrap.className = "abey-course-actions";
        for (const act of col.actions) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "abey-course-action";
          if (act.tone === "danger") {
            btn.classList.add("abey-course-action--danger");
          }
          btn.textContent = act.label;
          btn.addEventListener("click", () => {
            block.onAction?.(act.action, row, rowIndex);
          });
          actionWrap.appendChild(btn);
        }
        td.appendChild(actionWrap);
      } else if ("cell" in col && typeof col.cell === "function") {
        const out = col.cell(row, rowIndex);
        if (out instanceof HTMLElement) td.appendChild(out);
        else td.textContent = String(out);
      } else {
        const value = readCellField(row, col.field);
        td.textContent = value === undefined || value === null ? "" : String(value);
      }
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  table.appendChild(body);
  wrap.appendChild(table);

  const frag = document.createDocumentFragment();
  frag.appendChild(wrap);
  if (block.pagination) {
    const footer = document.createElement("footer");
    footer.className = "abey-courses__foot";
    footer.textContent = `1 to ${rows.length} of ${rows.length} records`;
    frag.appendChild(footer);
  }
  const host = document.createElement("div");
  host.appendChild(frag);
  return host;
}

export function mountScreenView<Row>(spec: ScreenSpec<Row>): (outlet: HTMLElement) => void {
  return (outlet) => {
    outlet.textContent = "";
    const root = document.createElement("section");
    root.className = "abey-courses abey-screen";

    const header = document.createElement("header");
    header.className = "abey-courses__head abey-screen__head";
    const title = document.createElement("h1");
    title.textContent = spec.title;
    header.appendChild(title);
    if (spec.toolbar?.length) {
      header.appendChild(renderToolbar(spec.toolbar));
    }
    root.appendChild(header);

    for (const block of spec.body) {
      if (block.kind === "dataTable") {
        root.appendChild(renderDataTable(block));
      }
    }

    outlet.appendChild(root);
  };
}
