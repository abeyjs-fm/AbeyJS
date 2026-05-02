import { ABEY, ABEY_TAG } from "../abey-form-classes.js";
import { ensureAbeyCheckboxElementDefined, type AbeyCheckboxElement } from "./abey-checkbox-element.js";

/** Toggle reutilizable “incluir campos opcionales” (misma UX que el formulario AbeyJs). */
export function mountOptionalFieldsToggle(onIncludedChange: (included: boolean) => void): {
  wrap: HTMLLabelElement;
  checkbox: HTMLInputElement;
  dispose: () => void;
} {
  ensureAbeyCheckboxElementDefined();
  const wrap = document.createElement("label");
  wrap.className = `${ABEY.field} abey-field--inlineOptional`;
  const host = document.createElement(ABEY_TAG.checkbox) as AbeyCheckboxElement;
  wrap.appendChild(host);
  const cb = host.abeyControl;
  cb.checked = true;
  const span = document.createElement("span");
  span.className = ABEY.fieldLabel;
  span.textContent = "Incluir campos opcionales";
  wrap.append(host, span);
  const onChange = (): void => {
    onIncludedChange(cb.checked);
  };
  cb.addEventListener("change", onChange);
  return {
    wrap,
    checkbox: cb,
    dispose: () => {
      cb.removeEventListener("change", onChange);
    },
  };
}
