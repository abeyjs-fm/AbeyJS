import { ABEY, ABEY_TAG } from "../abey-form-classes.js";

export class AbeyRadioElement extends HTMLElement {
  #inp: HTMLInputElement | null = null;

  get abeyControl(): HTMLInputElement {
    if (!this.#inp) {
      const inp = document.createElement("input");
      inp.type = "radio";
      inp.className = ABEY.radio;
      this.#inp = inp;
      this.appendChild(inp);
    }
    return this.#inp;
  }

  connectedCallback(): void {
    this.abeyControl;
  }

  static define(tagName: string = ABEY_TAG.radio): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, AbeyRadioElement as CustomElementConstructor);
    }
  }
}

export function ensureAbeyRadioElementDefined(): void {
  AbeyRadioElement.define();
}
