import type { OmegaReadableSignal } from "../state/signal.js";

export type SignalListOptions = {
  /** Máximo de items a renderizar (default: sin límite). */
  limit?: number;
};

export type MountedSignalList = {
  dispose: () => void;
};

/**
 * Renderiza una lista (UL/OL/DIV) desde un signal de items.
 * Sin `innerHTML`: el `renderItem` devuelve nodos DOM.
 *
 * Implementación simple: re-render completo cuando cambia el signal.
 * (Podemos optimizar a reconciliación por key más adelante.)
 */
export function mountSignalList<T>(
  root: HTMLElement,
  items: OmegaReadableSignal<readonly T[]>,
  renderItem: (item: T, index: number) => Node,
  options: SignalListOptions = {},
): MountedSignalList {
  const limit = options.limit;

  const render = (arr: readonly T[]): void => {
    root.textContent = "";
    const n = typeof limit === "number" && limit >= 0 ? Math.min(arr.length, limit) : arr.length;
    for (let i = 0; i < n; i++) {
      root.appendChild(renderItem(arr[i] as T, i));
    }
  };

  const unsub = items.subscribe((arr) => render(arr));

  return {
    dispose: () => {
      unsub();
      root.textContent = "";
    },
  };
}

