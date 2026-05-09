var _a;
import { mountModuleStyles } from "./mount-module-styles.js";
import { bindAbeyTemplate } from "./bind-abey-template.js";
import { tryInjectFromDom } from "../di/dom-di.js";
const ABEY_SHADOW_INNER = "[data-abey-component-inner]";
function getRuntimeFromPath(pathRaw) {
    const path = (pathRaw ?? "").trim() || "__abeyRuntime";
    const parts = path.split(".").filter(Boolean);
    let cur = globalThis;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object")
            return null;
        cur = cur[p];
    }
    return (cur ?? null);
}
function kebabFromPascal(input) {
    return input
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[_\s]+/g, "-")
        .toLowerCase();
}
export class AbeyComponentElement extends HTMLElement {
    static meta;
    static get observedAttributes() {
        return ["runtimepath"];
    }
    #styles = null;
    #bound = null;
    #runtime = null;
    #runtimePath = "__abeyRuntime";
    #mounted = false;
    #disposers = [];
    #stateRaw = {};
    #stateProxy = null;
    #renderQueued = false;
    #runtimeRetryTimer = null;
    #runtimeRetryCount = 0;
    /** Mutable data for bindings (available as `state` and top-level keys). Auto-render on mutation. */
    get state() {
        if (this.#stateProxy)
            return this.#stateProxy;
        this.#stateProxy = this.#makeReactiveState(this.#stateRaw);
        return this.#stateProxy;
    }
    set state(v) {
        this.#stateRaw = (v ?? {});
        this.#stateProxy = this.#makeReactiveState(this.#stateRaw);
        this.#queueRender();
    }
    /** Runtime resolved from `runtimepath` (default `__abeyRuntime`). */
    get runtime() {
        return this.#runtime;
    }
    /** Avoid `querySelector` in components: lookup by `id` within this component (shadow or light DOM). */
    elById(id) {
        const key = String(id ?? "").trim();
        if (!key)
            return null;
        const scope = (this.shadowRoot ?? this);
        return scope.querySelector(`#${CSS.escape(key)}`) ?? null;
    }
    /** Avoid `querySelector` in components: lookup by `data-role="..."` within this component (shadow or light DOM). */
    elByRole(role) {
        const key = String(role ?? "").trim();
        if (!key)
            return null;
        const scope = (this.shadowRoot ?? this);
        return scope.querySelector(`[data-role="${CSS.escape(key)}"]`) ?? null;
    }
    /**
     * Shortcut: get the runtime channel via DOM-DI when present, otherwise fallback to `runtime.channel`.
     * Lets you write: `const channel = this.channel<any>();`
     */
    channel() {
        const from = this.#bindingMount();
        return (tryInjectFromDom("channel", from) ?? this.#runtime?.channel);
    }
    /** Inner mount node (shadow inner wrapper) or the host element for DOM-DI. */
    #bindingMount() {
        if (this.shadowRoot) {
            const inner = this.shadowRoot.querySelector(ABEY_SHADOW_INNER);
            if (inner)
                return inner;
        }
        return this;
    }
    connectedCallback() {
        this.#runtimePath =
            (this.getAttribute("runtimepath") ?? this.constructor.meta?.runtimePath ?? "__abeyRuntime")
                .trim() || "__abeyRuntime";
        this.#runtime = getRuntimeFromPath(this.#runtimePath);
        queueMicrotask(() => {
            if (!this.isConnected)
                return;
            this.#mount();
        });
    }
    disconnectedCallback() {
        this.#dispose();
    }
    attributeChangedCallback(_name, oldValue, newValue) {
        if (oldValue === newValue)
            return;
        if (!this.isConnected)
            return;
        this.#runtimePath = (this.getAttribute("runtimepath") ?? "__abeyRuntime").trim() || "__abeyRuntime";
        this.#runtime = getRuntimeFromPath(this.#runtimePath);
        queueMicrotask(() => {
            if (!this.isConnected)
                return;
            this.#mount();
        });
    }
    render() {
        this.#bound?.render();
    }
    #queueRender() {
        if (this.#renderQueued)
            return;
        this.#renderQueued = true;
        queueMicrotask(() => {
            this.#renderQueued = false;
            if (!this.isConnected)
                return;
            this.render();
        });
    }
    #makeReactiveState(obj) {
        const host = this;
        return new Proxy(obj, {
            set(target, prop, value) {
                target[prop] = value;
                host.#queueRender();
                return true;
            },
            deleteProperty(target, prop) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete target[prop];
                host.#queueRender();
                return true;
            },
        });
    }
    onDestroy(dispose) {
        this.#disposers.push(dispose);
    }
    subscribe(topic, handler) {
        const domChannel = tryInjectFromDom("channel", this);
        const on = typeof domChannel?.on === "function"
            ? domChannel.on
            : this.#runtime?.channel?.on;
        if (typeof on !== "function")
            return;
        const off = on.call(domChannel ?? this.#runtime?.channel, topic, handler);
        if (typeof off === "function") {
            this.onDestroy(() => {
                try {
                    off();
                }
                catch {
                    /* */
                }
            });
        }
    }
    /** Subscribe to **`omega/ecosystem/<slug>/...`** (**`saved`**, **`invalid`**, **`reset`**) helpers. */
    wireEcosystemChannel(channelName, handlers) {
        const ch = String(channelName ?? "").trim();
        if (!ch)
            return;
        const slug = kebabFromPascal(ch);
        if (handlers.onSaved)
            this.subscribe(`omega/ecosystem/${slug}/saved`, handlers.onSaved);
        if (handlers.onInvalid)
            this.subscribe(`omega/ecosystem/${slug}/invalid`, handlers.onInvalid);
        if (handlers.onReset)
            this.subscribe(`omega/ecosystem/${slug}/reset`, handlers.onReset);
    }
    #ctx() {
        // Context dinámico: no "snapshot" de state (evita que `banner` quede congelado).
        const host = this;
        const helpers = {
            formStore: (path) => {
                const form = host.closest?.("abey-form");
                return form?.getStoreValue ? form.getStoreValue(path) : undefined;
            },
            setState: (patch) => {
                host.state = { ...(host.state ?? {}), ...(patch ?? {}) };
            },
        };
        return new Proxy(helpers, {
            get(_target, prop) {
                if (prop === "state")
                    return host.state;
                if (prop in helpers)
                    return helpers[prop];
                return host.state[prop];
            },
            has(_target, prop) {
                if (prop === "state")
                    return true;
                return prop in helpers || prop in host.state;
            },
            ownKeys() {
                const keys = new Set();
                keys.add("state");
                for (const k of Reflect.ownKeys(helpers))
                    keys.add(k);
                for (const k of Reflect.ownKeys(host.state))
                    keys.add(k);
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
                        value: helpers[prop],
                    };
                }
                if (Object.prototype.hasOwnProperty.call(host.state, prop)) {
                    return {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: host.state[prop],
                    };
                }
                return undefined;
            },
        });
    }
    #dispose() {
        if (this.#runtimeRetryTimer != null) {
            clearTimeout(this.#runtimeRetryTimer);
            this.#runtimeRetryTimer = null;
        }
        this.#runtimeRetryCount = 0;
        for (const d of this.#disposers) {
            try {
                d();
            }
            catch {
                /* */
            }
        }
        this.#disposers = [];
        this.#bound?.dispose();
        this.#bound = null;
        this.#styles?.dispose();
        this.#styles = null;
    }
    #useShadow(meta) {
        const blocks = meta?.stylesText ?? [];
        return blocks.some((s) => String(s ?? "").trim().length > 0);
    }
    #mount() {
        this.#dispose();
        // Re-resolve runtime at mount time (bootstrap may set global runtime after element connected).
        this.#runtime = getRuntimeFromPath(this.#runtimePath);
        const meta = this.constructor.meta;
        const shadowMode = this.#useShadow(meta);
        if (!this.#mounted) {
            // Component is responsible for its own template, but only once.
            const providers = (meta?.providers ?? [])
                .map((p) => {
                const token = String(p?.token ?? "").trim();
                if (!token)
                    return "";
                const useValue = p?.useValue;
                const useFactory = p?.useFactory;
                if (typeof useValue === "string") {
                    return `<abey-provide token="${token}" use-value="${useValue.replaceAll('"', "&quot;")}"></abey-provide>`;
                }
                if (typeof useFactory === "string") {
                    return `<abey-provide token="${token}" use-factory="${useFactory.replaceAll('"', "&quot;")}"></abey-provide>`;
                }
                return `<abey-provide token="${token}"></abey-provide>`;
            })
                .join("");
            const body = `${providers}${meta?.template ?? ""}`;
            if (shadowMode) {
                if (!this.shadowRoot)
                    this.attachShadow({ mode: "open" });
                const styleTags = (meta?.stylesText ?? [])
                    .map((s) => String(s ?? "").replace(/<\/style/gi, "<\\/style"))
                    .filter((s) => s.trim().length > 0)
                    .map((css) => `<style data-abey-encapsulated="1">${css}</style>`)
                    .join("");
                this.shadowRoot.innerHTML = `${styleTags}<div data-abey-component-inner="1">${body}</div>`;
            }
            else {
                this.innerHTML = body;
            }
            this.#mounted = true;
            this.setAttribute("data-abey-component", "mounted");
        }
        const bindRoot = (() => {
            if (!shadowMode)
                return this;
            const inner = this.shadowRoot?.querySelector(ABEY_SHADOW_INNER);
            return inner ?? this;
        })();
        this.#styles = mountModuleStyles((meta?.stylesHrefs ?? []).map(String));
        this.#bound = bindAbeyTemplate(bindRoot, { runtime: this.#runtime, state: this.#ctx(), element: bindRoot });
        this.render();
        // Si el runtime aún no existe (p. ej. `__abeyRuntime` se setea después), reintentar montar.
        if (!this.#runtime) {
            const maxRetries = 30;
            if (this.#runtimeRetryCount < maxRetries) {
                this.#runtimeRetryCount += 1;
                this.#runtimeRetryTimer = window.setTimeout(() => {
                    this.#runtimeRetryTimer = null;
                    if (!this.isConnected)
                        return;
                    this.#mount();
                }, 50);
            }
        }
        else {
            this.#runtimeRetryCount = 0;
        }
    }
}
_a = AbeyComponentElement;
/**
 * Registers a component as a real custom element.
 * Usage:
 * - `defineAbeyComponent({ selector: "app-foo", template, stylesText: [css] }, class extends AbeyComponentElement { ... })`
 */
export function defineAbeyComponent(meta, ctor) {
    const selector = String(meta.selector ?? "").trim();
    if (!selector) {
        throw new Error("[defineAbeyComponent] meta.selector es requerido.");
    }
    ctor.meta = meta;
    if (!customElements.get(selector)) {
        customElements.define(selector, ctor);
    }
    return ctor;
}
/**
 * Class decorator that registers **`defineAbeyComponent`** metadata on the target constructor.
 *
 * ```ts
 * @AbeyComponent({ selector: "app-foo", template, stylesText: [sheet] })
 * class AppFoo extends AbeyComponentElement {}
 * ```
 */
export function AbeyComponent(meta) {
    return (target) => {
        defineAbeyComponent(meta, target);
    };
}
