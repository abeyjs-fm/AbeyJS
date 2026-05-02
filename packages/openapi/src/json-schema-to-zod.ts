import { z, type ZodType } from "zod";
import { derefNode } from "./refs.js";

type AnyObj = Record<string, unknown>;

/**
 * Narrow **JSON Schema object** → **`z.object`**: flat scalars (string, number, integer, boolean), optional keys from **`required`**, `$ref` via **`derefNode`**.
 */
export function jsonObjectSchemaToZod(spec: { components?: { schemas?: AnyObj } }, body: any): ZodType<Record<string, unknown>> {
  const s = derefNode(spec, body) as { type?: string; properties?: AnyObj; required?: string[]; additionalProperties?: unknown } | null;
  if (!s || s.type !== "object" || !s.properties) {
    return z.object({});
  }
  const required = new Set(s.required ?? []);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [k, v0] of Object.entries(s.properties)) {
    const v = derefNode(spec, v0) as { type?: string; enum?: unknown[] };
    const base = (() => {
      if (v.enum && v.enum.length > 0) {
        if (v.enum.length === 1) {
          return z.literal(String(v.enum[0]));
        }
        return z.enum([String(v.enum[0]), String(v.enum[1]), ...v.enum.slice(2).map((x) => String(x))] as [string, string, ...string[]]);
      }
      switch (v.type) {
        case "string":
          return z.string();
        case "number":
        case "integer":
          return z.coerce.number();
        case "boolean":
          return z.coerce.boolean();
        default:
          return z.unknown();
      }
    })();
    shape[k] = required.has(k) ? base : (base as z.ZodTypeAny).optional();
  }
  return z.object(shape) as z.ZodType<Record<string, unknown>>;
}

/** Prefers **`id`**, otherwise first declared property name, fallback **`"id"`**. */
export function guessRowKeyFromSchema(spec: { components?: { schemas?: AnyObj } }, itemSchema: unknown): string {
  const s = derefNode(spec, itemSchema) as { type?: string; properties?: AnyObj; required?: string[] } | null;
  if (!s?.properties) {
    return "id";
  }
  if ("id" in s.properties) {
    return "id";
  }
  return Object.keys(s.properties)[0] ?? "id";
}
