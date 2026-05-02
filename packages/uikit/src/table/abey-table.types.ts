export type AbeyTableStatusTone = "success" | "warning" | "danger" | "neutral";

export type AbeyTableCell =
  | string
  | number
  | boolean
  | null
  | undefined
  | Node
  | Array<string | number | boolean | null | undefined | Node>;

export type AbeyTableColumn<Row> = {
  key: string;
  header: string | Node;
  width?: string;
  align?: "left" | "center" | "right";
  frozen?: "left" | "right";
  render?: (row: Row) => AbeyTableCell;
  value?: (row: Row) => string | number | boolean | null | undefined;
};

export type AbeyTableAction<Row> = {
  id: string;
  label: string;
  onSelect?: (row: Row, ctx: { ev: Event; table: import("./abey-table.js").AbeyTableElement<Row> }) => void;
  eventName?: string;
  disabled?: (row: Row) => boolean;
};

export type AbeyTableConfig<Row> = {
  getRowId?: (row: Row) => string;
  columns?: Array<AbeyTableColumn<Row>>;
  rows?: Array<Row>;
  selectable?: boolean;
  initialSelectedIds?: Iterable<string>;
  actions?: Array<AbeyTableAction<Row>>;
  rowActions?: (row: Row) => Array<AbeyTableAction<Row>>;
  onSelectionChange?: (selectedIds: ReadonlySet<string>) => void;
  dense?: boolean;
};

export type AbeyTableLoadNetworkDetail = {
  page: number;
  pageSize: number;
  query: string;
};

