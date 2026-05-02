import { ABEY_TAG } from "../abey-form-classes.js";
import type { ViewField } from "../form/form-types.js";
import { ensureAbeyInputElementDefined, type AbeyInputElement } from "./abey-input-element.js";

/** Monta `<abey-input>` con `<input class="abey-input">` según `kind` (text, number, email, date, readonly, file). */
export function mountTextInputField(
  lab: HTMLLabelElement,
  f: ViewField,
  draft: Map<string, string>,
  opts?: { bindingId?: string },
): { input: HTMLInputElement; dispose: () => void } {
  const bindingId = opts?.bindingId ?? f.name;
  ensureAbeyInputElementDefined();
  const host = document.createElement(ABEY_TAG.input) as AbeyInputElement;
  lab.appendChild(host);
  const inp = host.abeyControl;
  inp.name = bindingId;
  const kind = f.kind;
  inp.readOnly = kind === "readonly";
  if (kind === "number") inp.type = "number";
  else if (kind === "email") inp.type = "email";
  else if (kind === "date") inp.type = "date";
  else if (kind === "file") inp.type = "file";
  else inp.type = "text";
  host.setAttribute("type", inp.type);

  const pushDraft = (): void => {
    if (kind === "file") {
      const file = inp.files?.[0];
      draft.set(bindingId, file ? file.name : "");
      return;
    }
    draft.set(bindingId, inp.value);
  };

  const onInput = (): void => {
    pushDraft();
  };
  const onChange = (): void => {
    pushDraft();
  };

  if (kind === "file") {
    inp.addEventListener("change", onChange);
  } else {
    inp.addEventListener("input", onInput);
  }

  return {
    input: inp,
    dispose: () => {
      if (kind === "file") inp.removeEventListener("change", onChange);
      else inp.removeEventListener("input", onInput);
    },
  };
}
