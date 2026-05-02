import type { LineItemsColumnDef } from "./mount-line-items-table.js";

export type GeneratedLineItemsColumn = {
  binding: string;
  label: string;
  uiKind?: string;
  lineRule?: unknown;
};

/**
 * Convierte columnas generadas (docgen) a definiciones para `mountLineItemsTable`.
 * Soporta `{ binding, label, uiKind, lineRule }` como shape mínimo.
 */
export function lineItemsColumnsFromGenerated(
  cols: readonly GeneratedLineItemsColumn[],
): LineItemsColumnDef[] {
  return cols.map((c) => {
    const kind: LineItemsColumnDef["kind"] =
      c.uiKind === "number" ? "number" : c.uiKind === "textarea" ? "textarea" : "text";
    const rule = c.lineRule as LineItemsColumnDef["rule"] | undefined;
    return { name: c.binding, label: c.label, kind, rule, required: rule === "min1" ? true : undefined };
  });
}

export type LineItemsEmptyRowOverrides = Partial<Record<string, unknown>> | ((col: LineItemsColumnDef) => unknown);

export type LineItemsEmptyRowOptions = {
  /**
   * Valor default para columnas `number` cuando no hay override.
   * Default: 0
   */
  numberValue?: number;
  /**
   * Valor default para `text`/`textarea` cuando no hay override.
   * Default: ""
   */
  textValue?: string;
  /**
   * Overrides por nombre de campo o función por columna.
   * Ej: `{ cantidad: 1 }` o `(col) => (col.name === "cantidad" ? 1 : undefined)`.
   */
  overrides?: LineItemsEmptyRowOverrides;
};

/**
 * Crea una fila vacía a partir de las columnas de `mountLineItemsTable`.
 * Útil para `createEmptyRow` y para construir `initialRows`.
 */
export function createLineItemsEmptyRow(
  columns: LineItemsColumnDef[],
  o: LineItemsEmptyRowOptions = {},
): Record<string, unknown> {
  const numberValue = o.numberValue ?? 0;
  const textValue = o.textValue ?? "";
  const overrides = o.overrides;

  const row: Record<string, unknown> = {};
  for (const col of columns) {
    let v: unknown = undefined;
    if (typeof overrides === "function") {
      v = overrides(col);
    } else if (overrides && Object.prototype.hasOwnProperty.call(overrides, col.name)) {
      v = (overrides as Record<string, unknown>)[col.name];
    }
    if (v !== undefined) {
      row[col.name] = v;
      continue;
    }
    row[col.name] = col.kind === "number" ? numberValue : textValue;
  }
  return row;
}

