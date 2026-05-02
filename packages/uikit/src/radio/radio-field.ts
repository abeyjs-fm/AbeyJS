import { ABEY_TAG } from "../abey-form-classes.js";
import type { ViewField } from "../form/form-types.js";
import { ensureAbeyRadioElementDefined, type AbeyRadioElement } from "./abey-radio-element.js";

/** Monta `<abey-radio>` con `<input class="abey-radio">` interno dentro del `label`. */
export function mountRadioField(
  lab: HTMLLabelElement,
  f: ViewField,
  draft: Map<string, string>,
  opts?: { groupBindingId?: string },
): { input: HTMLInputElement; radioGroup: string; dispose: () => void } {
  const group = (f.radioGroup ?? f.name).trim() || f.name;
  const groupBindingId = opts?.groupBindingId ?? group;
  ensureAbeyRadioElementDefined();
  const host = document.createElement(ABEY_TAG.radio) as AbeyRadioElement;
  lab.appendChild(host);
  const inp = host.abeyControl;
  inp.name = groupBindingId;
  inp.value = f.name;
  const onChange = (): void => {
    if (inp.checked) draft.set(groupBindingId, f.name);
  };
  inp.addEventListener("change", onChange);
  return {
    input: inp,
    radioGroup: group,
    dispose: () => {
      inp.removeEventListener("change", onChange);
    },
  };
}
