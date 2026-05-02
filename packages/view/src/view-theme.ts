/**
 * Tema y plantilla visual de `@abeyjs/view`: hoja `theme/omega-default.css`
 * (import en tu app) + variables opcionales por nodo o por selector global.
 */
export const ABEYJS_VIEW_BASE_CLASS = "abey" as const;

/**
 * Añadido a cada raíz creada por `mount*`. Con la hoja por defecto, puedes
 * redefinir apariencia con `className` (p. ej. `abey--dark`) o `vars`.
 */
export type ViewTheme = {
  /**
   * Clases extra en el nodo host del componente (p. ej. `abey--dark mi-marca`),
   * además de `abey` y, según el montaje, el bloque (`abey-list`, `abey-form`…).
   */
  className?: string;
  /**
   * Sobrescritura de `var(--abey-…)` en ese nodo; hereda a los hijos.
   * P. ej. `{ "--abey-accent": "#0d9488" }` para un acento teal.
   */
  vars?: Partial<Record<string, string>>;
};

const splitClasses = (s: string | undefined): string[] =>
  (s ?? "")
    .split(/\s+/)
    .map((c) => c.trim())
    .filter(Boolean);

export function applyViewTheme(
  el: HTMLElement,
  theme: ViewTheme | undefined,
  /** Bloque BEM, p. ej. `abey-list` o `abey-form` (además de `abey`) */
  block: string,
): void {
  el.classList.add(ABEYJS_VIEW_BASE_CLASS, block, ...splitClasses(theme?.className));
  if (theme?.vars) {
    for (const [k, v] of Object.entries(theme.vars)) {
      if (v !== undefined) {
        el.style.setProperty(k, v);
      }
    }
  }
}
