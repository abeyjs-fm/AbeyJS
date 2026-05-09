import type { AbeyFormElement } from "./abey-form-impl.js";

/** Mueve Restablecer/Enviar al final del bloque `.abey-form__tabs` (misma idea que invoice / docgen-demo). */
export function moveAbeyFormActionsIntoTabShell(form: AbeyFormElement): boolean {
  const f = form.querySelector("form");
  const shell = f?.querySelector(".abey-form__tabs");
  const actions = f?.querySelector(".abey-form__actions");
  if (!f || !shell || !actions) {
    return false;
  }
  if (actions.parentElement === shell) {
    return true;
  }
  shell.appendChild(actions);
  actions.classList.add("abey-form__actions--in-tabshell");
  return true;
}

export type SlotAbeyFormTabPanelOptions = {
  /** Título opcional encima del host (p. ej. clase `…__tabpanel-title`). */
  title?: string;
  titleClassName?: string;
  titleTag?: "h2" | "h3" | "h4";
};

/**
 * Inserta (o mueve) `host` dentro del panel `panelIndex` y opcionalmente agrega un título.
 * Importante: NO borra el contenido existente del panel (para no romper el surface del form).
 */
export function slotHostIntoAbeyFormTabPanel(
  form: AbeyFormElement,
  host: HTMLElement,
  panelIndex: number,
  options?: SlotAbeyFormTabPanelOptions,
): boolean {
  const panels = form.querySelectorAll(".abey-form__tabpanel");
  const panel = panels[panelIndex];
  if (!panel) {
    return false;
  }

  const opt = options ?? {};
  const title = opt.title?.trim();
  if (title) {
    // Reuse the title node if it already exists.
    const existing = panel.querySelector("[data-abey-tabpanel-title]") as HTMLElement | null;
    const h = existing ?? document.createElement(opt.titleTag ?? "h3");
    h.setAttribute("data-abey-tabpanel-title", "1");
    if (opt.titleClassName) h.className = opt.titleClassName;
    h.textContent = title;
    if (!existing) {
      panel.insertBefore(h, panel.firstChild);
    }
  }
  if (host.parentElement !== panel) {
    panel.appendChild(host);
  }
  return true;
}

/** Devuelve el `host` al contenedor `poolSelector` bajo `root` (p. ej. `[data-role=…-pool]`). */
export function restoreAbeyFormHostToPool(
  root: HTMLElement | null,
  poolSelector: string,
  host: HTMLElement | null,
): void {
  const pool = root?.querySelector(poolSelector);
  if (pool && host && host.parentElement !== pool) {
    pool.appendChild(host);
  }
}
