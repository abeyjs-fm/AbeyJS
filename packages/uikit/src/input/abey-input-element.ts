import { ABEY, ABEY_TAG } from "../abey-form-classes.js";

const HTML_INPUT_TYPES = new Set([
  "text",
  "number",
  "email",
  "date",
  "file",
  "password",
  "search",
  "tel",
  "url",
]);

function normalizeInputType(raw: string | null): string {
  const t = (raw ?? "text").toLowerCase().trim();
  return HTML_INPUT_TYPES.has(t) ? t : "text";
}

/**
 * `<abey-input>`: el tipo se define con el atributo `type` (p. ej. `text`, `number`, `file`)
 * o lo asigna el montador al `<input class="abey-input">` interno.
 */
export class AbeyInputElement extends HTMLElement {
  static observedAttributes = ["type"];

  #inp: HTMLInputElement | null = null;

  get abeyControl(): HTMLInputElement {
    if (!this.#inp) {
      const inp = document.createElement("input");
      inp.className = ABEY.input;
      const fromAttr = normalizeInputType(this.getAttribute("type"));
      inp.type = fromAttr;
      this.#inp = inp;
      this.appendChild(inp);
    }
    return this.#inp;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name !== "type" || !this.#inp) return;
    this.#inp.type = normalizeInputType(value);
  }

  connectedCallback(): void {
    const inp = this.abeyControl;
    const t = normalizeInputType(this.getAttribute("type"));
    if (inp.type !== t) inp.type = t;
  }

  static define(tagName: string = ABEY_TAG.input): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, AbeyInputElement as CustomElementConstructor);
    }
  }
}

export function ensureAbeyInputElementDefined(): void {
  AbeyInputElement.define();
}
