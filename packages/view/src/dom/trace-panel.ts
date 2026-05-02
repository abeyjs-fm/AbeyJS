import type { OmegaRuntime } from "@abeyjs/runtime";
import { applyViewTheme, type ViewTheme } from "../view-theme.js";

export type TracePanelOptions = {
  max?: number;
  theme?: ViewTheme;
};

/**
 * Trazas del bus en un contenedor — actualiza con el botón o llama `refresh()`.
 * `max` o `{ max, theme }` (tercer argumento).
 */
export function mountTracePanel(
  root: HTMLElement,
  runtime: OmegaRuntime,
  maxOrOptions: number | TracePanelOptions = 40,
): { refresh: () => void } {
  const max =
    typeof maxOrOptions === "number" ? maxOrOptions : (maxOrOptions.max ?? 40);
  const theme: ViewTheme | undefined =
    typeof maxOrOptions === "object" && maxOrOptions ? maxOrOptions.theme : undefined;

  applyViewTheme(root, theme, "abey-trace");

  const head = document.createElement("div");
  head.className = "abey-trace__head";
  const title = document.createElement("span");
  title.textContent = "Trazas (canal)";
  const refBtn = document.createElement("button");
  refBtn.type = "button";
  refBtn.className = "abey-btn abey-btn--sm";
  refBtn.textContent = "Actualizar";
  head.appendChild(title);
  head.appendChild(refBtn);
  const list = document.createElement("ol");
  list.className = "abey-trace__list";
  root.appendChild(head);
  root.appendChild(list);
  const paint = (): void => {
    list.textContent = "";
    for (const e of runtime.getTraceSnapshot().slice(-max)) {
      const li = document.createElement("li");
      li.className = "abey-trace__item";
      li.appendChild(document.createTextNode(`${e.source ? `[${e.source}] ` : ""}`));
      const s = document.createElement("strong");
      s.textContent = e.name;
      li.appendChild(s);
      li.appendChild(document.createTextNode(" "));
      const c = document.createElement("code");
      c.className = "abey-trace__code";
      c.textContent = typeof e.data === "object" ? JSON.stringify(e.data) : String(e.data);
      li.appendChild(c);
      li.appendChild(document.createTextNode(" " + e.correlationId));
      list.appendChild(li);
    }
  };
  refBtn.addEventListener("click", paint);
  paint();
  return { refresh: paint };
}
