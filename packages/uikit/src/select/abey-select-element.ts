import { ABEY_TAG } from "../abey-form-classes.js";

/** Contenedor ligero del combo (hidden + input + menú). */
export class AbeySelectElement extends HTMLElement {
  static define(tagName: string = ABEY_TAG.select): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, AbeySelectElement as CustomElementConstructor);
    }
  }
}

export function ensureAbeySelectElementDefined(): void {
  AbeySelectElement.define();
}
