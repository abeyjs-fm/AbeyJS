export type DomDiToken = string;
export type DomDiFactory<T = unknown> = (ctx: {
    host: Element;
    token: DomDiToken;
}) => T;
/**
 * Resuelve un token buscando el provider más cercano hacia arriba en el DOM:
 * `<abey-provide token="x" ...>` dentro de scopes/containers.
 */
export declare function injectFromDom<T = unknown>(tokenRaw: DomDiToken, from: Element): T;
export declare function tryInjectFromDom<T = unknown>(tokenRaw: DomDiToken, from: Element): T | undefined;
export declare class AbeyProvideElement extends HTMLElement {
    static get observedAttributes(): string[];
    connectedCallback(): void;
    attributeChangedCallback(): void;
    static define(tagName?: string): void;
}
//# sourceMappingURL=dom-di.d.ts.map