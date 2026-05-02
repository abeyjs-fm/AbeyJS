import { ABEY_TAG } from "../abey-form-classes.js";
import { ensureAbeyCheckboxElementDefined, type AbeyCheckboxElement } from "./abey-checkbox-element.js";

/** Monta `<abey-checkbox>` con `<input class="abey-checkbox">` interno dentro del `label`. */
export function mountCheckboxField(
  lab: HTMLLabelElement,
  name: string,
  draft: Map<string, string>,
  opts?: { bindingId?: string },
): { input: HTMLInputElement; dispose: () => void } {
  const bindingId = opts?.bindingId ?? name;
  ensureAbeyCheckboxElementDefined();
  const host = document.createElement(ABEY_TAG.checkbox) as AbeyCheckboxElement;
  lab.appendChild(host);
  const inp = host.abeyControl;
  inp.name = bindingId;
  const onChange = (): void => {
    draft.set(bindingId, inp.checked ? "1" : "");
  };
  inp.addEventListener("change", onChange);
  return {
    input: inp,
    dispose: () => {
      inp.removeEventListener("change", onChange);
    },
  };
}
