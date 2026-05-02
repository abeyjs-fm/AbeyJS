export type AbeyButtonVariant = "primary" | "secondary" | "ghost";

export class AbeyButtonElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["variant", "disabled", "type"];
  }

  #btn: HTMLButtonElement | null = null;

  connectedCallback(): void {
    this.setAttribute("data-abey-button", "1");
    this.#ensureButton();
    this.#sync();
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.#sync();
  }

  #ensureButton(): void {
    if (this.#btn && this.contains(this.#btn)) return;
    const existing = this.querySelector("button");
    if (existing instanceof HTMLButtonElement) {
      this.#btn = existing;
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    // Move current children into the button (so <abey-button>Text</abey-button> works).
    while (this.firstChild) {
      btn.appendChild(this.firstChild);
    }
    this.appendChild(btn);
    this.#btn = btn;
  }

  #sync(): void {
    const btn = this.#btn;
    if (!btn) return;

    const variant = ((this.getAttribute("variant") ?? "primary").trim() || "primary") as AbeyButtonVariant;
    const disabled = this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const type = (this.getAttribute("type") ?? "").trim();

    btn.className = "abey-btn";
    if (variant === "secondary") btn.classList.add("abey-btn--secondary");
    else if (variant === "ghost") btn.classList.add("abey-btn--ghost");
    else btn.classList.add("abey-btn--primary");

    if (type) btn.type = type as any;
    btn.disabled = !!disabled;
  }

  static define(tagName = "abey-button"): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, AbeyButtonElement as CustomElementConstructor);
    }
  }
}

