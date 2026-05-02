/**
 * **`@AbeyComponent` / `AbeyComponentElement`**: binds compiler-style templates + **`state`** (+ optional **`OmegaRuntime`** at **`runtimepath`**) using **`bindAbeyTemplate`** and **`mountModuleStyles`**.
 */
import type { OmegaRuntime } from "@abeyjs/runtime";
import { mountModuleStyles, type ModuleStylesHandle } from "./mount-module-styles.js";
import { bindAbeyTemplate, type BoundTemplate } from "./bind-abey-template.js";
import { tryInjectFromDom } from "../di/dom-di.js";

export type AbeyComponentMeta = {
  selector: string;
  template: string;
  stylesHrefs?: string[];
  /**
   * Optional DOM-DI providers that will be prepended to the component template.
   * This enables `injectFromDom("x", this)` inside the component without touching outer HTML.
   */
  providers?: Array<
    | { token: string; useValue: string }
    | { token: string; useFactory: string }
    | { token: string }
  >;
  /**
   * Global runtime path (default: `__abeyRuntime`).
   * The custom element can override it via `runtimepath="..."`.
   */
  runtimePath?: string;
};

function getRuntimeFromPath(pathRaw: string): OmegaRuntime | null {
  const path = (pathRaw ?? "").trim() || "__abeyRuntime";
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = globalThis as unknown;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return (cur ?? null) as OmegaRuntime | null;
}

function kebabFromPascal(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

export class AbeyComponentElement extends HTMLElement {
  static meta: AbeyComponentMeta;

  static get observedAttributes(): string[] {
    return ["runtimepath"];
  }

  #styles: ModuleStylesHandle | null = null;
  #bound: BoundTemplate | null = null;
  #runtime: OmegaRuntime | null = null;
  #runtimePath = "__abeyRuntime";
  #mounted = false;
  #disposers: Array<() => void> = [];
  #stateRaw: Record<string, unknown> = {};
  #stateProxy: Record<string, unknown> | null = null;
  #renderQueued = false;
  #runtimeRetryTimer: number | null = null;
  #runtimeRetryCount = 0;

  /** Mutable data for bindings (available as `state` and top-level keys). Auto-render on mutation. */
  get state(): Record<string, unknown> {
    if (this.#stateProxy) return this.#stateProxy;
    this.#stateProxy = this.#makeReactiveState(this.#stateRaw);
    return this.#stateProxy;
  }

  set state(v: Record<string, unknown>) {
    this.#stateRaw = (v ?? {}) as Record<string, unknown>;
    this.#stateProxy = this.#makeReactiveState(this.#stateRaw);
    this.#queueRender();
  }

  /** Runtime resolved from `runtimepath` (default `__abeyRuntime`). */
  protected get runtime(): OmegaRuntime | null {
    return this.#runtime;
  }

  /** Avoid `querySelector` in components: lookup by `id` within this component root. */
  protected elById<T extends Element = Element>(id: string): T | null {
    const key = String(id ?? "").trim();
    if (!key) return null;
    return (this.querySelector(`#${CSS.escape(key)}`) as T | null) ?? null;
  }

  /** Avoid `querySelector` in components: lookup by `data-role="..."` within this component root. */
  protected elByRole<T extends Element = Element>(role: string): T | null {
    const key = String(role ?? "").trim();
    if (!key) return null;
    return (this.querySelector(`[data-role="${CSS.escape(key)}"]`) as T | null) ?? null;
  }

  /**
   * Shortcut: get the runtime channel via DOM-DI when present, otherwise fallback to `runtime.channel`.
   * Lets you write: `const channel = this.channel<any>();`
   */
  protected channel<T = unknown>(): T | undefined {
    return (tryInjectFromDom<T>("channel", this) ?? ((this.#runtime as any)?.channel as T | undefined)) as T | undefined;
  }

  connectedCallback(): void {
    this.#runtimePath =
      (this.getAttribute("runtimepath") ?? (this.constructor as typeof AbeyComponentElement).meta?.runtimePath ?? "__abeyRuntime")
        .trim() || "__abeyRuntime";
    this.#runtime = getRuntimeFromPath(this.#runtimePath);

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
    this.#runtime = getRuntimeFromPath(this.#runtimePath);
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#mount();
    });
  }

  render(): void {
    this.#bound?.render();
  }

  #queueRender(): void {
    if (this.#renderQueued) return;
    this.#renderQueued = true;
    queueMicrotask(() => {
      this.#renderQueued = false;
      if (!this.isConnected) return;
      this.render();
    });
  }

  #makeReactiveState<T extends Record<string, unknown>>(obj: T): T {
    const host = this;
    return new Proxy(obj, {
      set(target, prop, value) {
        (target as any)[prop] = value;
        host.#queueRender();
        return true;
      },
      deleteProperty(target, prop) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (target as any)[prop];
        host.#queueRender();
        return true;
      },
    });
  }

  protected onDestroy(dispose: () => void): void {
    this.#disposers.push(dispose);
  }

  protected subscribe<T = unknown>(topic: string, handler: (data: T) => void): void {
    const domChannel = tryInjectFromDom<any>("channel", this);
    const on =
      typeof domChannel?.on === "function"
        ? (domChannel.on as (t: string, h: (d: unknown) => void) => (() => void))
        : ((this.#runtime as any)?.channel?.on as ((t: string, h: (d: unknown) => void) => (() => void)) | undefined);
    if (typeof on !== "function") return;
    const off = on.call(domChannel ?? (this.#runtime as any)?.channel, topic, handler as (d: unknown) => void);
    if (typeof off === "function") {
      this.onDestroy(() => {
        try {
          off();
        } catch {
          /* */
        }
      });
    }
  }

  /** Subscribe to **`omega/ecosystem/<slug>/...`** (**`saved`**, **`invalid`**, **`reset`**) helpers. */
  public wireEcosystemChannel(
    channelName: string,
    handlers: {
      onSaved?: (data: unknown) => void;
      onInvalid?: (data: unknown) => void;
      onReset?: () => void;
    },
  ): void {
    const ch = String(channelName ?? "").trim();
    if (!ch) return;
    const slug = kebabFromPascal(ch);
    if (handlers.onSaved) this.subscribe(`omega/ecosystem/${slug}/saved`, handlers.onSaved);
    if (handlers.onInvalid) this.subscribe(`omega/ecosystem/${slug}/invalid`, handlers.onInvalid);
    if (handlers.onReset) this.subscribe(`omega/ecosystem/${slug}/reset`, handlers.onReset as (d: unknown) => void);
  }

  #ctx(): Record<string, unknown> {
    // Context dinámico: no "snapshot" de state (evita que `banner` quede congelado).
    const host = this;
    const helpers: Record<string, unknown> = {
      formStore: (path: string) => {
        const form = host.closest?.("abey-form") as any;
        return form?.getStoreValue ? form.getStoreValue(path) : undefined;
      },
      setState: (patch: Record<string, unknown>) => {
        host.state = { ...(host.state ?? {}), ...(patch ?? {}) };
      },
    };
    return new Proxy(helpers, {
      get(_target, prop) {
        if (prop === "state") return host.state;
        if (prop in helpers) return (helpers as any)[prop];
        return (host.state as any)[prop as any];
      },
      has(_target, prop) {
        if (prop === "state") return true;
        return prop in helpers || prop in (host.state as any);
      },
      ownKeys() {
        const keys = new Set<string | symbol>();
        keys.add("state");
        for (const k of Reflect.ownKeys(helpers)) keys.add(k);
        for (const k of Reflect.ownKeys(host.state)) keys.add(k);
        return Array.from(keys);
      },
      getOwnPropertyDescriptor(_target, prop) {
        if (prop === "state") {
          return { configurable: true, enumerable: true, writable: false, value: host.state };
        }
        if (Object.prototype.hasOwnProperty.call(helpers, prop)) {
          return {
            configurable: true,
            enumerable: true,
            writable: false,
            value: (helpers as any)[prop],
          };
        }
        if (Object.prototype.hasOwnProperty.call(host.state, prop)) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            value: (host.state as any)[prop as any],
          };
        }
        return undefined;
      },
    });
  }

  #dispose(): void {
    if (this.#runtimeRetryTimer != null) {
      clearTimeout(this.#runtimeRetryTimer);
      this.#runtimeRetryTimer = null;
    }
    this.#runtimeRetryCount = 0;
    for (const d of this.#disposers) {
      try {
        d();
      } catch {
        /* */
      }
    }
    this.#disposers = [];
    this.#bound?.dispose();
    this.#bound = null;
    this.#styles?.dispose();
    this.#styles = null;
  }

  #mount(): void {
    this.#dispose();

    // Re-resolve runtime at mount time (bootstrap may set global runtime after element connected).
    this.#runtime = getRuntimeFromPath(this.#runtimePath);

    const meta = (this.constructor as typeof AbeyComponentElement).meta;
    if (!this.#mounted) {
      // Component is responsible for its own template, but only once.
      const providers = (meta?.providers ?? [])
        .map((p) => {
          const token = String((p as any)?.token ?? "").trim();
          if (!token) return "";
          const useValue = (p as any)?.useValue;
          const useFactory = (p as any)?.useFactory;
          if (typeof useValue === "string") {
            return `<abey-provide token="${token}" use-value="${useValue.replaceAll('"', "&quot;")}"></abey-provide>`;
          }
          if (typeof useFactory === "string") {
            return `<abey-provide token="${token}" use-factory="${useFactory.replaceAll('"', "&quot;")}"></abey-provide>`;
          }
          return `<abey-provide token="${token}"></abey-provide>`;
        })
        .join("");
      this.innerHTML = `${providers}${meta?.template ?? ""}`;
      this.#mounted = true;
      this.setAttribute("data-abey-component", "mounted");
    }

    this.#styles = mountModuleStyles((meta?.stylesHrefs ?? []).map(String));
    this.#bound = bindAbeyTemplate(this, { runtime: this.#runtime, state: this.#ctx(), element: this });
    this.render();

    // Si el runtime aún no existe (p. ej. `__abeyRuntime` se setea después), reintentar montar.
    if (!this.#runtime) {
      const maxRetries = 30;
      if (this.#runtimeRetryCount < maxRetries) {
        this.#runtimeRetryCount += 1;
        this.#runtimeRetryTimer = window.setTimeout(() => {
          this.#runtimeRetryTimer = null;
          if (!this.isConnected) return;
          this.#mount();
        }, 50);
      }
    } else {
      this.#runtimeRetryCount = 0;
    }
  }
}

/**
 * Registers a component as a real custom element.
 * Usage:
 * - `defineAbeyComponent({ selector: "app-foo", template, stylesHrefs }, class extends AbeyComponentElement { ... })`
 */
export function defineAbeyComponent<T extends CustomElementConstructor>(
  meta: AbeyComponentMeta,
  ctor: T,
): T {
  const selector = String(meta.selector ?? "").trim();
  if (!selector) {
    throw new Error("[defineAbeyComponent] meta.selector es requerido.");
  }
  (ctor as any).meta = meta;
  if (!customElements.get(selector)) {
    customElements.define(selector, ctor);
  }
  return ctor;
}

/**
 * Decorator-style API (Angular-like):
 *
 * ```ts
 * @AbeyComponent({ selector: "app-foo", template, stylesHrefs: [...] })
 * class AppFoo extends AbeyComponentElement {}
 * ```
 */
export function AbeyComponent(meta: AbeyComponentMeta): ClassDecorator {
  return (target) => {
    defineAbeyComponent(meta, target as unknown as CustomElementConstructor);
  };
}

