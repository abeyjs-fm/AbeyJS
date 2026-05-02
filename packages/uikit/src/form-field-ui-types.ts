import type { ViewField } from "./form/form-types.js";

/**
 * Handle de estado DOM por campo (p. ej. registro compartido con {@link mountSelectField}).
 * Exportado para integraciones avanzadas fuera del formulario data-driven.
 */
export type OmegaFormFieldUi = {
  kind: ViewField["kind"];
  name: string;
  /** Clave única en `draft` / `fieldByName` (incluye prefijo de pestaña si aplica). */
  bindingId: string;
  /** `null` = campo raíz; si no, `record[storeKey]` en el payload. */
  valueStoreKey: string | null;
  /** Metadatos del campo (lectura / errores / valor anidado). */
  field: ViewField;
  root: HTMLLabelElement;
  input: HTMLInputElement;
  hidden?: HTMLInputElement;
  menu?: HTMLDivElement;
  selectClearButton?: HTMLButtonElement;
  /** Refresca visibilidad del × (solo si el combo permite vaciar). */
  syncSelectClearVisibility?: () => void;
  error?: HTMLSpanElement;
  selectItems?: Array<{ value: string; label: string }>;
  selectActiveIndex?: number;
  selectOpen?: boolean;
  radioGroup?: string;
  optional?: boolean;
  dispose?: () => void;
};
