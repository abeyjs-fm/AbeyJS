import type { FieldSelectOptions } from "./form-types.js";

function valueAtPath(payload: unknown, path: string): unknown {
  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  let cur: unknown = payload;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in (cur as Record<string, unknown>))) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Normalized list envelope: root array or **`data`** / **`items`** / **`results`** / **`value`**. */
function normalizeListRowsForSelect(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    for (const k of ["data", "items", "results", "value"] as const) {
      const v = root[k];
      if (Array.isArray(v)) {
        return v as Record<string, unknown>[];
      }
    }
  }
  return [];
}

export type FieldSelectItem = { value: string; label: string };

/**
 * Maps generic list JSON (**GET**) into **`{ value, label }[]`** for **`kind: "select"`** (**`FieldSelectOptions`**).
 * Same envelope rules as **`DynamicCrudAgent.fetchLookupOptions`** (**`@abeyjs/openapi`**).
 */
export function mapJsonToFieldSelectItems(
  incoming: unknown,
  opts: Pick<FieldSelectOptions, "dataPath" | "valueField" | "labelField">,
): FieldSelectItem[] {
  const nested = opts.dataPath ? valueAtPath(incoming, opts.dataPath) : incoming;
  const rows = normalizeListRowsForSelect(nested);
  return rows
    .map((row) => {
      const value = row[opts.valueField];
      const label = row[opts.labelField];
      if (value == null || label == null) {
        return null;
      }
      return { value: String(value), label: String(label) };
    })
    .filter((x): x is FieldSelectItem => x != null);
}

/**
 * **`fetch`**-based helper suitable for **`AbeyFormConfig.resolveSelectOptions`** (browser / worker).
 * Prefer **`mapJsonToFieldSelectItems(await http.getJson(...), opts)`** when using **`@abeyjs/http`** for correlation-aware calls.
 */
export async function resolveFieldSelectOptionsFromFetch(
  opts: FieldSelectOptions,
): Promise<FieldSelectItem[]> {
  const res = await fetch(opts.endpoint);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const incoming: unknown = await res.json();
  return mapJsonToFieldSelectItems(incoming, opts);
}
