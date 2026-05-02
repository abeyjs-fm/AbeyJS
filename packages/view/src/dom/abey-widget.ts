import { intentOf } from "@abeyjs/core";
import type { OmegaRuntime } from "@abeyjs/runtime";
import type { BoundTemplate } from "./bind-abey-template.js";
import { bindAbeyTemplate } from "./bind-abey-template.js";

type WidgetBannerTone = "idle" | "ok" | "err";

export type AbeyWidgetState = {
  banner: { text: string; tone: WidgetBannerTone };
  lastPreview: string;
};

function kebabFromPascal(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function getRuntimeFromPath(pathRaw: string): OmegaRuntime | null {
  const path = pathRaw.trim() || "__abeyRuntime";
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = globalThis as unknown;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return (cur ?? null) as OmegaRuntime | null;
}


export class AbeyWidgetElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["runtimepath", "channel"];
  }

  #runtimePath = "__abeyRuntime";
  #channel = "";
  #runtime: OmegaRuntime | null = null;
  #unsubs: Array<() => void> = [];

  #templateHtml = "";
  #bound: BoundTemplate | null = null;
  #state: AbeyWidgetState = { banner: { text: "", tone: "idle" }, lastPreview: "" };

  get state(): AbeyWidgetState {
    return this.#state;
  }

  set state(v: AbeyWidgetState) {
    this.#state = v;
    this.render();
  }

  connectedCallback(): void {
    this.#runtimePath = (this.getAttribute("runtimepath") ?? "__abeyRuntime").trim() || "__abeyRuntime";
    this.#channel = (this.getAttribute("channel") ?? "").trim();
    this.#runtime = getRuntimeFromPath(this.#runtimePath);

    // IMPORTANTE: cuando el elemento se crea durante parsing (innerHTML),
    // `connectedCallback` puede dispararse antes de que se hayan insertado sus hijos.
    // Por eso diferimos el mount a microtask para capturar el template completo.
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#mount();
    });
  }

  disconnectedCallback(): void {
    this.#dispose();
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if (!this.isConnected) return;
    this.#runtimePath = (this.getAttribute("runtimepath") ?? "__abeyRuntime").trim() || "__abeyRuntime";
    this.#channel = (this.getAttribute("channel") ?? "").trim();
    this.#runtime = getRuntimeFromPath(this.#runtimePath);
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#mount();
    });
  }

  render(): void {
    this.#bound?.render();
  }

  static define(tagName = "abey-widget"): void {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, AbeyWidgetElement as CustomElementConstructor);
    }
  }

  #dispose(): void {
    for (const u of this.#unsubs) {
      try {
        u();
      } catch {
        /* */
      }
    }
    this.#unsubs = [];
    this.#bound?.dispose();
    this.#bound = null;
  }

  #mount(): void {
    this.#dispose();

    // Capturar template real una sola vez (ahora que el DOM ya está completo).
    if (!this.#templateHtml) {
      this.#templateHtml = this.innerHTML;
    }
    // NO re-renderizar innerHTML: si lo hacemos, destruimos componentes hijos ya inicializados
    // (ej: <abey-form> configurado desde TS). Solo bindeamos sobre el DOM existente.
    this.#bindTemplate();
    this.#wireChannel();
    this.render();
    this.setAttribute("data-abey-widget", this.#templateHtml.trim() ? "connected" : "connected-empty-template");
  }

  #ctxFor(el?: Element, ev?: Event): Record<string, unknown> {
    const widget = this;
    const runtime = this.#runtime;
    const ctx: Record<string, unknown> = {
      state: widget.#state,
      banner: widget.#state.banner,
      lastPreview: widget.#state.lastPreview,
      $event: ev,
      $el: el ?? null,
      set: (path: string, value: unknown) => {
        const p = String(path ?? "").trim();
        if (!p) return;
        if (p === "banner.text") widget.#state.banner.text = String(value ?? "");
        else if (p === "banner.tone") widget.#state.banner.tone = String(value ?? "idle") as WidgetBannerTone;
        else if (p === "lastPreview") widget.#state.lastPreview = String(value ?? "");
        widget.render();
      },
      dispatchIntent: (name: string, payload: unknown) => {
        const n = String(name ?? "").trim();
        if (!n || !runtime || typeof (runtime as any).dispatch !== "function") return;
        void (runtime as any).dispatch(intentOf(n, payload), { source: "abey-widget" });
      },
      json: (v: unknown, space = 2) => JSON.stringify(v, null, space),
      formStore: (path: string) => {
        const host = (el ?? widget).closest?.("abey-form") as any;
        return host?.getStoreValue ? host.getStoreValue(path) : undefined;
      },
    };
    return ctx;
  }

  #bindTemplate(): void {
    this.#bound?.dispose();
    this.#bound = bindAbeyTemplate(this, {
      runtime: this.#runtime,
      state: this.#ctxFor(),
      element: this,
    });
  }

  #wireChannel(): void {
    const rt = this.#runtime;
    const ch = this.#channel;
    if (!rt || typeof (rt as any).channel?.on !== "function" || !ch) return;

    const slug = kebabFromPascal(ch);
    const saved = `omega/ecosystem/${slug}/saved`;
    const invalid = `omega/ecosystem/${slug}/invalid`;
    const reset = `omega/ecosystem/${slug}/reset`;

    const unsubs: Array<() => void> = [];
    unsubs.push(
      (rt as any).channel.on(saved, (data: unknown) => {
        this.#state.lastPreview = JSON.stringify(data, null, 2);
        this.#state.banner = { text: `Guardado (${ch})`, tone: "ok" };
        this.render();
      }),
    );
    unsubs.push(
      (rt as any).channel.on(invalid, (data: any) => {
        const fe = data?.fieldErrors && typeof data.fieldErrors === "object" ? (data.fieldErrors as any) : {};
        const summary = Object.entries(fe)
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(" · ");
        this.#state.banner = { text: summary ? `Validación: ${summary}` : "Validación", tone: "err" };
        this.render();
      }),
    );
    unsubs.push(
      (rt as any).channel.on(reset, () => {
        this.#state.banner = { text: "", tone: "idle" };
        this.render();
      }),
    );

    this.#unsubs.push(...unsubs);
  }
}

