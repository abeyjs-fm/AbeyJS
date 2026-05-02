/**
 * Fusiona `incoming` sobre `current` por `rowKey`, reutilizando el **mismo objeto**
 * de fila cuando el id ya existía (útil con listas reactivas granulares en la vista).
 * Devuelve un **nuevo** arreglo (nueva referencia) de filas.
 */
export function mergeListRowsByKey<T extends Record<string, unknown>>(
  current: readonly T[] | T[],
  incoming: readonly T[] | T[],
  rowKey: string,
): T[] {
  const pool = new Map<string, T>();
  for (const r of current) {
    const id = r[rowKey];
    if (id === null || id === undefined) {
      continue;
    }
    const k = String(id);
    if (!pool.has(k)) {
      pool.set(k, r);
    }
  }
  return incoming.map((inc) => {
    const id = inc[rowKey];
    if (id === null || id === undefined) {
      return { ...inc } as T;
    }
    const k = String(id);
    const prev = pool.get(k);
    if (prev) {
      Object.assign(prev, inc);
      return prev;
    }
    const copy = { ...inc } as T;
    pool.set(k, copy);
    return copy;
  });
}
