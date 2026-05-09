import { AbeyComponent, AbeyComponentElement } from "@abeyjs/runtime";
import template from "./abey-dialog.html?raw";
import styles from "./abey-dialog.css?inline";

@AbeyComponent({
  selector: "abey-dialog",
  template: template,
  stylesText: [styles],
})
export class AbeyDialogElement extends AbeyComponentElement {
  #onCloseBound: (() => void) | null = null;
  #onCancelBound: ((ev: Event) => void) | null = null;
  #onClickBound: ((ev: MouseEvent) => void) | null = null;
  #onResizeBound: (() => void) | null = null;

  static override get observedAttributes(): string[] {
    return [
      "open",
      "header",
      "width",
      "modal",
      "dismissablemask",
      "closeonescape",
      "closable",
      "maximizable",
      "breakpoints",
    ];
  }

  constructor() {
    super();
    this.state = {
      header: "",
      width: "50vw",
      maximized: false,
      closable: true,
      maximizable: false,
    };
  }

  get #dialog(): HTMLDialogElement | null {
    return (this.shadowRoot ?? this).querySelector("dialog");
  }
  get #maximizeButton(): HTMLButtonElement | null {
    return (this.shadowRoot ?? this).querySelector('[data-role="toggle-maximize"]');
  }
  get #maximizeIcon(): HTMLElement | null {
    return (this.shadowRoot ?? this).querySelector('[data-role="maximize-icon"]');
  }
  get #closeButton(): HTMLButtonElement | null {
    return (this.shadowRoot ?? this).querySelector('[data-role="close-btn"]');
  }

  #attrTrue(name: string, fallback = false): boolean {
    const raw = this.getAttribute(name);
    if (raw == null) return fallback;
    const v = raw.trim().toLowerCase();
    if (v === "" || v === "true" || v === "1" || v === "yes" || v === "on") return true;
    if (v === "false" || v === "0" || v === "no" || v === "off") return false;
    return fallback;
  }

  #applyResponsiveWidth(): void {
    const dialog = this.#dialog;
    if (!dialog) return;
    const isMax = Boolean((this.state as { maximized?: boolean }).maximized);
    dialog.classList.toggle("abey-dialog--maximized", isMax);
    if (isMax) {
      dialog.style.width = "100vw";
      return;
    }
    const baseWidth = String((this.state as { width?: string }).width ?? "50vw");
    const bpRaw = (this.getAttribute("breakpoints") ?? "").trim();
    if (!bpRaw) {
      dialog.style.width = baseWidth;
      return;
    }
    try {
      const parsed = JSON.parse(bpRaw) as Record<string, string>;
      const width = window.innerWidth;
      let applied = baseWidth;
      const rules = Object.entries(parsed)
        .map(([k, v]) => ({ k: Number.parseInt(String(k).replace(/[^\d]/g, ""), 10), v }))
        .filter((x) => Number.isFinite(x.k))
        .sort((a, b) => a.k - b.k);
      for (const r of rules) {
        if (width <= r.k) {
          applied = r.v;
          break;
        }
      }
      dialog.style.width = applied;
    } catch {
      dialog.style.width = baseWidth;
    }
  }

  #syncControlsVisibility(): void {
    const isMaximizable = this.#attrTrue("maximizable", false);
    const isClosable = this.#attrTrue("closable", true);
    const isMax = Boolean((this.state as { maximized?: boolean }).maximized);
    const maxBtn = this.#maximizeButton;
    const closeBtn = this.#closeButton;
    const maxIcon = this.#maximizeIcon;
    if (maxBtn) maxBtn.hidden = !isMaximizable;
    if (closeBtn) closeBtn.hidden = !isClosable;
    if (maxIcon) maxIcon.textContent = isMax ? "❐" : "□";
  }

  #syncDialogMode(): void {
    const dialog = this.#dialog;
    if (!dialog) return;
    const isOpen = this.hasAttribute("open");
    if (!isOpen) {
      if (dialog.open) this.close();
      return;
    }
    const isModal = this.#attrTrue("modal", true);
    if (isModal) {
      if (!dialog.open) dialog.showModal();
    } else if (!dialog.open) {
      dialog.show();
    }
    this.#applyResponsiveWidth();
  }

  public toggleMaximize(): void {
    if (!this.#attrTrue("maximizable", false)) return;
    const current = Boolean((this.state as { maximized?: boolean }).maximized);
    (this.state as { maximized: boolean }).maximized = !current;
    this.#applyResponsiveWidth();
    this.#syncControlsVisibility();
  }

  override attributeChangedCallback(
    name: string,
    old: string | null,
    val: string | null,
  ): void {
    super.attributeChangedCallback(name, old, val);

    if (name === "header") this.state.header = val ?? "";
    if (name === "width") this.state.width = val ?? "50vw";
    if (name === "closable") {
      (this.state as { closable: boolean }).closable = this.#attrTrue("closable", true);
    }
    if (name === "maximizable") {
      (this.state as { maximizable: boolean }).maximizable = this.#attrTrue("maximizable", false);
    }
    this.#syncDialogMode();
    this.#applyResponsiveWidth();
    this.#syncControlsVisibility();
  }

  public showModal() {
    const dialog = this.#dialog;
    if (dialog) {
      // If it's in the middle of a closing animation, stop it
      dialog.classList.remove("abey-dialog--closing");
      if (!dialog.open) {
        const isModal = this.#attrTrue("modal", true);
        if (isModal) dialog.showModal();
        else dialog.show();
      }
    }
    this.setAttribute("open", "");
  }

  public close() {
    if (!this.#attrTrue("closable", true)) return;
    const dialog = this.#dialog;
    if (!dialog || !dialog.open) {
      this.removeAttribute("open");
      return;
    }

    if (dialog.classList.contains("abey-dialog--closing")) {
      return;
    }

    dialog.classList.add("abey-dialog--closing");

    const onEnd = (ev: AnimationEvent) => {
      if (ev.animationName === "abey-dialog-exit") {
        dialog.removeEventListener("animationend", onEnd);
        // Important: check if we are still supposed to be closing
        if (dialog.classList.contains("abey-dialog--closing")) {
          dialog.classList.remove("abey-dialog--closing");
          dialog.close();
          this.removeAttribute("open");
        }
      }
    };
    dialog.addEventListener("animationend", onEnd);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    queueMicrotask(() => {
      if (!this.isConnected) return;

      const dialog = this.#dialog;
      if (!dialog) return;

      this.#onCloseBound = () => {
        this.removeAttribute("open");
      };
      this.#onCancelBound = (ev: Event) => {
        if (!this.#attrTrue("closeonescape", true)) {
          ev.preventDefault();
        }
      };
      this.#onClickBound = (ev: MouseEvent) => {
        const roleEl = ev
          .composedPath()
          .find(
            (n) =>
              n instanceof HTMLElement &&
              (n.getAttribute("data-role") === "close-btn" ||
                n.getAttribute("data-role") === "toggle-maximize"),
          ) as HTMLElement | undefined;
        if (roleEl) {
          const role = roleEl.getAttribute("data-role");
          if (role === "close-btn") {
            this.close();
            return;
          }
          if (role === "toggle-maximize") {
            this.toggleMaximize();
            return;
          }
        }
        if (!this.#attrTrue("dismissablemask", true)) return;
        const r = dialog.getBoundingClientRect();
        const outside =
          ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom;
        if (outside) this.close();
      };
      this.#onResizeBound = () => this.#applyResponsiveWidth();

      dialog.addEventListener("close", this.#onCloseBound);
      dialog.addEventListener("cancel", this.#onCancelBound);
      dialog.addEventListener("click", this.#onClickBound);
      window.addEventListener("resize", this.#onResizeBound);

      (this.state as { closable: boolean }).closable = this.#attrTrue("closable", true);
      (this.state as { maximizable: boolean }).maximizable = this.#attrTrue("maximizable", false);

      this.#syncDialogMode();
      this.#applyResponsiveWidth();
      this.#syncControlsVisibility();
    });
  }

  override disconnectedCallback(): void {
    const dialog = this.#dialog;
    if (dialog && this.#onCloseBound) dialog.removeEventListener("close", this.#onCloseBound);
    if (dialog && this.#onCancelBound) dialog.removeEventListener("cancel", this.#onCancelBound);
    if (dialog && this.#onClickBound) dialog.removeEventListener("click", this.#onClickBound);
    if (this.#onResizeBound) window.removeEventListener("resize", this.#onResizeBound);
    this.#onCloseBound = null;
    this.#onCancelBound = null;
    this.#onClickBound = null;
    this.#onResizeBound = null;
    super.disconnectedCallback();
  }
}
