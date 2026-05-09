import type { OmegaRuntime } from "@abeyjs/runtime";
export type AbeyTemplateContext = {
    runtime?: OmegaRuntime | null;
    state?: Record<string, unknown>;
    element?: Element;
};
export type BoundTemplate = {
    render(): void;
    dispose(): void;
};
/**
 * Bindea un subtree existente (no escribe innerHTML) con:
 * - `{{ expr }}` en text nodes
 * - `[hidden]`, `[class.foo]`, `[attr.x]`
 * - `(event)` handlers con expresiones
 * - `{{ }}` dentro de atributos normales
 * - No bindea dentro de descendientes `@pre,code` (literales OM en código / docs).
 */
export declare function bindAbeyTemplate(root: Element, ctx: AbeyTemplateContext): BoundTemplate;
//# sourceMappingURL=bind-abey-template.d.ts.map