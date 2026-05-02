import { ABEY, ABEY_TAG } from "../abey-form-classes.js";

export class AbeyCheckboxElement extends HTMLElement {
  #inp: HTMLInputElement | null = null;

  /** `<input type="checkbox" class="abey-checkbox">` interno (formulario / `FieldUI`). */
  get abeyControl(): HTMLInputElement {
    if (!this.#inp) {
      const inp = document.createElement("input");
      inp.type = "checkbox";
      inp.className = ABEY.checkbox;
      this.#inp = inp;
      this.appendChild(inp);
    }
    return this.#inp;
  }

  connectedCallback(): void {
    this.abeyControl;
  }

  static define(tagName: string = ABEY_TAG.checkbox): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, AbeyCheckboxElement as CustomElementConstructor);
    }
  }
}

export function ensureAbeyCheckboxElementDefined(): void {
  AbeyCheckboxElement.define();
}
