/**
 * **`@abeyjs/validation`** — **Zod** helpers: **`safeParseWithErrors`** and field-error maps for AbeyJs forms/agents.
 * Peer: **`zod`**. **`README.md`** for behaviour notes (first-segment vs dotted maps).
 */
import type { ZodError, ZodType } from "zod";

export type { ZodType, ZodSchema } from "zod";
/** Re-export **`z`** so apps share one schema vocabulary with `@abeyjs/uikit`, `@abeyjs/openapi`, etc. */
export { z } from "zod";

/** One failed constraint on a value path (**`ZodIssue.path`** / **`message`**). */
export interface FieldError {
  path: (string | number)[];
  message: string;
}

/**
 * **`safeParse`** with a stable failure shape for UI layers: flattened **`fields`** mirror **`error.issues`**.
 */
export function safeParseWithErrors<T, S extends ZodType<T>>(
  schema: S,
  data: unknown,
):
  | { success: true; data: T }
  | { success: false; error: ZodError; fields: FieldError[] } {
  const r = schema.safeParse(data);
  if (r.success) {
    return { success: true, data: r.data };
  }
  return {
    success: false,
    error: r.error,
    fields: r.error.issues.map((i) => ({ path: i.path, message: i.message })),
  };
}

/**
 * First path segment **`path[0]`** → message (later segments ignored). Duplicate keys keep the **first** message.
 * Suited for flat form models keyed by top-level **`ViewField.name`**.
 */
export function fieldErrorsToMap(fields: FieldError[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const f of fields) {
    const k = String(f.path[0] ?? "_");
    if (!m[k]) {
      m[k] = f.message;
    }
  }
  return m;
}

/**
 * Full **`path`** joined with **`.`** (e.g. **`items.0.qty`**). Empty path uses **`"_"`**.
 */
export function fieldErrorsToDottedMap(fields: FieldError[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const f of fields) {
    const parts = f.path.filter((p) => p !== "" && p != null).map(String);
    const k = parts.length ? parts.join(".") : "_";
    if (!m[k]) {
      m[k] = f.message;
    }
  }
  return m;
}
