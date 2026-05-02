import type { Unsubscribe } from "@abeyjs/core";
import type { StateCell } from "@abeyjs/state";
import { applyViewTheme, type ViewTheme } from "../view-theme.js";

/**
 * Muestra texto reactivo desde un subconjunto de `viewState` (p. ej. mensaje de flujo).
 */
export function mountBoundText(
  root: HTMLElement,
  cell: StateCell<Record<string, unknown>>,
  getText: (s: unknown) => string,
  options: { as?: "p" | "div" | "pre"; theme?: ViewTheme; callout?: boolean } = {},
): Unsubscribe {
  const tag = options.as ?? "p";
  const useCallout = options.callout !== false;
  root.textContent = "";
  const n = document.createElement(tag);
  if (useCallout) {
    applyViewTheme(n, options.theme, "abey-callout");
  } else if (options.theme) {
    applyViewTheme(n, options.theme, "abey");
  }
  root.appendChild(n);
  const render = (): void => {
    const t = getText(cell.get());
    if (n.textContent !== t) {
      n.textContent = t;
    }
    if (t) {
      n.setAttribute("role", "status");
    } else {
      n.removeAttribute("role");
    }
  };
  render();
  return cell.subscribe(render);
}
