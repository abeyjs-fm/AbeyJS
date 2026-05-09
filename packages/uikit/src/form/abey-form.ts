let formLoadingPromise: Promise<void> | null = null;

/**
 * Registra el componente `<abey-form>` de forma asíncrona.
 * Solo descarga el código de lógica de formularios cuando realmente se necesita.
 */
export async function ensureAbeyFormElementDefined(): Promise<void> {
  if (customElements.get("abey-form")) return;
  if (formLoadingPromise) return formLoadingPromise;

  formLoadingPromise = (async () => {
    const { AbeyFormElement } = await import("./abey-form-impl.js");
    AbeyFormElement.define();
  })();

  return formLoadingPromise;
}
