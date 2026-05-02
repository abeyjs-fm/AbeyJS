/**
 * Política por defecto: **todo dato se trata como texto**; no hay `innerHTML` automático
 * en el modo automático. El HTML “dinámico” solo pasa por aquí o por
 * `setSanitizedHtml` (marcado `abey-html` / `data-abey-html`).
 */

let customSanitizeImpl: ((raw: string) => string) | undefined;

/**
 * Caracteres con significado en HTML → entidades. Salida segura para asignar a
 * `innerHTML` (no ejecuta marcas: se muestran como texto) o a `textContent`.
 */
export function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Navegación `a.b.c` en un valor (p. ej. `Curso` → `nombre` → …). */
export function getByPath(obj: unknown, path: string): unknown {
  const p = path.trim();
  if (!p) {
    return obj;
  }
  const parts = p.split(".");
  let cur: unknown = obj;
  for (const key of parts) {
    if (cur == null || (typeof cur !== "object" && typeof cur !== "function")) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/**
 * Sustituye `{{ a.b.c }}` en una plantilla por el valor **escapado** (nunca crudo).
 * Uso opt-in: si no usas esta API, el framework no interpreta `{{ }}` en cadenas.
 */
export function bindText(
  template: string,
  data: Record<string, string | number | boolean | null | undefined> | object,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key: string) => {
    const v = getByPath(data, key);
    if (v == null) {
      return "";
    }
    if (typeof v === "object") {
      return "";
    }
    return escapeHtml(String(v));
  });
}

/**
 * Sanitización por defecto: equivalente a {@link escapeHtml} (el riesgo de marcas
 * se elimina; el resultado es seguro en `innerHTML` porque no quedan tags activos).
 * Sustituye con {@link configureSanitize} (p. ej. DOMPurify) para HTML de confianza
 * con allowlist.
 */
export function sanitize(raw: string): string {
  if (customSanitizeImpl) {
    return customSanitizeImpl(raw);
  }
  return escapeHtml(raw);
}

/**
 * Instala un sanitizer global (p. ej. `import DOMPurify from "dompurify"`;
 * `configureSanitize((s) => DOMPurify.sanitize(s, { ... }))` ).
 */
export function configureSanitize(fn: (raw: string) => string): void {
  customSanitizeImpl = fn;
}

const AbeyJs = {
  sanitize,
  escapeHtml,
  bindText,
  getByPath,
} as const;

export { AbeyJs };

const TRUSTED_MARK = "data-abey-html";
const TRUSTED_CLASS = "abey-html";

/**
 * Asigna HTML al nodo **solo** tras `sanitize` y marca el contenedor como
 * `abey-html` + `data-abey-html` (declaración explícita de intención).
 * Sigue el principio: la seguridad es el camino por defecto; el riesgo es explícito.
 */
export function setSanitizedHtml(root: HTMLElement, untrusted: string, options?: { sanitizer?: (raw: string) => string }): void {
  const fn = options?.sanitizer ?? sanitize;
  root.classList.add(TRUSTED_CLASS);
  root.setAttribute(TRUSTED_MARK, "1");
  root.innerHTML = fn(untrusted);
}

/**
 * Limpia la marca de HTML confiado; vacía el contenido. Útil al desmontar vistas híbridas.
 */
export function clearSanitizedHtmlHost(root: HTMLElement): void {
  root.classList.remove(TRUSTED_CLASS);
  root.removeAttribute(TRUSTED_MARK);
  root.textContent = "";
}
