function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const k = parts[i]!;
    const next = cur[k];
    if (next == null || typeof next !== "object" || Array.isArray(next)) {
      cur[k] = {};
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * **`globalThis` registry** for declarative bindings (e.g. **`configpath="__app.form"`** attributes) — avoids pervasive **`as any`** in hosts.
 */
export function setGlobalRegistry<T>(key: string, value: T): void {
  (globalThis as unknown as Record<string, unknown>)[key] = value as unknown;
}

export function getGlobalRegistry<T>(key: string): T | undefined {
  return (globalThis as unknown as Record<string, unknown>)[key] as T | undefined;
}

/** Dot-path setter like **`"__demo.extras.items"`**, creating intermediate objects on **`globalThis`**. */
export function setGlobalRegistryPath(path: string, value: unknown): void {
  const p = path.trim();
  if (!p) return;
  const rootKey = p.split(".")[0]!;
  const root = ((globalThis as unknown as Record<string, unknown>)[rootKey] ?? {}) as Record<string, unknown>;
  if (typeof root !== "object" || Array.isArray(root)) {
    (globalThis as unknown as Record<string, unknown>)[rootKey] = {};
  }
  const base = (globalThis as unknown as Record<string, unknown>)[rootKey] as Record<string, unknown>;
  const rest = p.split(".").slice(1).join(".");
  if (!rest) {
    (globalThis as unknown as Record<string, unknown>)[rootKey] = value as unknown;
    return;
  }
  setByPath(base, rest, value);
}

export function getGlobalRegistryPath<T = unknown>(path: string): T | undefined {
  const p = path.trim();
  if (!p) return undefined;
  const rootKey = p.split(".")[0]!;
  const base = (globalThis as unknown as Record<string, unknown>)[rootKey];
  if (base == null || typeof base !== "object") return undefined;
  const rest = p.split(".").slice(1).join(".");
  if (!rest) return base as T;
  return getByPath(base as Record<string, unknown>, rest) as T | undefined;
}

