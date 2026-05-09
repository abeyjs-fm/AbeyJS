/**
 * **`@AbeyComponent` / `AbeyComponentElement`**: binds compiler-style templates + **`state`** (+ optional **`OmegaRuntime`** at **`runtimepath`**) using **`bindAbeyTemplate`** and **`mountModuleStyles`**.
 *
 * With **`stylesText`** (raw CSS, e.g. Vite `import css from "./x.css?inline"`), markup is mounted under **open Shadow DOM** so styles ship in the same JS chunk as the lazy route and stay scoped to the component.
 */
import type { OmegaRuntime } from "@abeyjs/runtime";
export type AbeyComponentMeta = {
    selector: string;
    template: string;
    /**
     * Stylesheet **URLs** only (Vite: `import href from "./view.css?url"` or `new URL("./view.css", import.meta.url).href`).
     * Passed to **`mountModuleStyles`** as **`<link href>`** values. **Never** use **`?inline`** text here — browsers
     * will request nonsensical paths and dev servers may log **`URI malformed`**.
     */
    stylesHrefs?: string[];
    /**
     * Raw CSS strings (e.g. `import sheet from "./view.css?inline"` in Vite). When non-empty, the template is
     * rendered inside **open shadow root** with `<style>` tags so styles load with the component module (no extra
     * network round-trip for `?url` stylesheets) and do not leak globally.
     */
    stylesText?: string[];
    /**
     * Optional DOM-DI providers that will be prepended to the component template.
     * This enables `injectFromDom("x", this)` inside the component without touching outer HTML.
     */
    providers?: Array<{
        token: string;
        useValue: string;
    } | {
        token: string;
        useFactory: string;
    } | {
        token: string;
    }>;
    /**
     * Global runtime path (default: `__abeyRuntime`).
     * The custom element can override it via `runtimepath="..."`.
     */
    runtimePath?: string;
};
export declare class AbeyComponentElement extends HTMLElement {
    #private;
    static meta: AbeyComponentMeta;
    static get observedAttributes(): string[];
    /** Mutable data for bindings (available as `state` and top-level keys). Auto-render on mutation. */
    get state(): Record<string, unknown>;
    set state(v: Record<string, unknown>);
    /** Runtime resolved from `runtimepath` (default `__abeyRuntime`). */
    protected get runtime(): OmegaRuntime | null;
    /** Avoid `querySelector` in components: lookup by `id` within this component (shadow or light DOM). */
    protected elById<T extends Element = Element>(id: string): T | null;
    /** Avoid `querySelector` in components: lookup by `data-role="..."` within this component (shadow or light DOM). */
    protected elByRole<T extends Element = Element>(role: string): T | null;
    /**
     * Shortcut: get the runtime channel via DOM-DI when present, otherwise fallback to `runtime.channel`.
     * Lets you write: `const channel = this.channel<any>();`
     */
    protected channel<T = unknown>(): T | undefined;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void;
    render(): void;
    protected onDestroy(dispose: () => void): void;
    protected subscribe<T = unknown>(topic: string, handler: (data: T) => void): void;
    /** Subscribe to **`omega/ecosystem/<slug>/...`** (**`saved`**, **`invalid`**, **`reset`**) helpers. */
    wireEcosystemChannel(channelName: string, handlers: {
        onSaved?: (data: unknown) => void;
        onInvalid?: (data: unknown) => void;
        onReset?: () => void;
    }): void;
}
/**
 * Registers a component as a real custom element.
 * Usage:
 * - `defineAbeyComponent({ selector: "app-foo", template, stylesText: [css] }, class extends AbeyComponentElement { ... })`
 */
export declare function defineAbeyComponent<T extends CustomElementConstructor>(meta: AbeyComponentMeta, ctor: T): T;
/**
 * Class decorator that registers **`defineAbeyComponent`** metadata on the target constructor.
 *
 * ```ts
 * @AbeyComponent({ selector: "app-foo", template, stylesText: [sheet] })
 * class AppFoo extends AbeyComponentElement {}
 * ```
 */
export declare function AbeyComponent(meta: AbeyComponentMeta): ClassDecorator;
//# sourceMappingURL=define-abey-component.d.ts.map