import { z } from "zod";
import type { LineItemsColumnDef } from "./mount-line-items-table.js";

export type LineItemsZodOptions = {
  /**
   * Si querés mensajes custom por columna.
   * Por defecto se usan `col.label`.
   */
  message?: (col: LineItemsColumnDef, rule: "required" | NonNullable<LineItemsColumnDef["rule"]>) => string;
};

function defaultMsg(col: LineItemsColumnDef, rule: "required" | NonNullable<LineItemsColumnDef["rule"]>): string {
  if (rule === "required") return `${col.label} obligatorio`;
  if (rule === "min1") return `${col.label} obligatorio`;
  if (rule === "positive") return `${col.label} > 0`;
  return `${col.label} ≥ 0`;
}

/**
 * Crea un `ZodObject` para una línea (`items[i]`) usando reglas declarativas en columnas.
 * Pensado para validar `items[]` en el agente sin escribir Zod a mano por cada documento.
 */
export function createLineItemsRowSchema<TRow = Record<string, unknown>>(
  columns: readonly LineItemsColumnDef[],
  opts: LineItemsZodOptions = {},
): z.ZodType<TRow> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const col of columns) {
    const msg = (rule: "required" | NonNullable<LineItemsColumnDef["rule"]>) =>
      opts.message?.(col, rule) ?? defaultMsg(col, rule);

    if (col.kind === "number") {
      let s = z.coerce.number();
      if (col.rule === "positive") s = s.positive(msg("positive"));
      if (col.rule === "nonNegative") s = s.nonnegative(msg("nonNegative"));
      shape[col.name] = s;
      continue;
    }

    // text / textarea
    let s = z.string();
    const must = col.required === true || col.rule === "min1";
    if (must) s = s.min(1, msg(col.rule === "min1" ? "min1" : "required"));
    shape[col.name] = s;
  }

  return z.object(shape) as unknown as z.ZodType<TRow>;
}

