import type { AbeyJsViewElement } from "./abeyjs-view-element.js";
import { registerAbeyJsView } from "./abeyjs-view-element.js";
import { setSanitizedHtml } from "./safe-html.js";

export type AbeyJsViewTemplateOptions = {
  /**
   * Identificador lógico (también `name` en `<abeyjs-view name="...">` para depurar / estilos).
   */
  name: string;
  /**
   * Marcado a inyectar dentro del contenedor. Suele importarse con `?raw` desde un `.html`.
   */
  template: string;
  /**
   * Datos para `{{ruta}}`, `abeyjs-for`, `abeyjs-html` (nunca asigna `innerHTML` crudo a entradas de usuario).
   * Usa função si al montar querés re-leer (p. ej. de un servicio mínimo).
   */
  model: Record<string, unknown> | (() => Record<string, unknown>);
  className?: string;
  /**
   * Contenedor que envuelve `<abeyjs-view>` y el pie, para márgenes y CSS de la vista (p. ej. `abey-abeyview-page abey-view--foo`).
   */
  rootClassName?: string;
  /**
   * Texto opcional bajo el contenedor (misma piel que otras notas de ejemplo).
   */
  footnote?: string;
};

/**
 * Crea un `mount(outlet)` que pone un `<abeyjs-view>`, inyecta `template` y aplica el modelo.
 * Mantiene el código de la ruta a lo mínimo: plantilla en `.html?raw` + objeto de datos.
 */
export function mountAbeyJsViewTemplate(o: AbeyJsViewTemplateOptions): (outlet: HTMLElement) => void {
  return (outlet: HTMLElement) => {
    registerAbeyJsView();
    outlet.textContent = "";
    const root = o.rootClassName?.trim() ? document.createElement("div") : null;
    if (root) {
      root.className = o.rootClassName!.trim();
    }
    const target = root ?? outlet;
    const host = document.createElement("abeyjs-view") as AbeyJsViewElement;
    host.className = o.className?.trim() ? o.className : "abey-abeyview";
    host.name = o.name;
    host.innerHTML = o.template;
    const data = typeof o.model === "function" ? o.model() : o.model;
    host.model = data;
    target.appendChild(host);
    if (o.footnote?.trim()) {
      const p = document.createElement("p");
      p.className = "abey-abeyview-note";
      setSanitizedHtml(p, o.footnote.trim());
      target.appendChild(p);
    }
    if (root) {
      outlet.appendChild(root);
    }
  };
}
