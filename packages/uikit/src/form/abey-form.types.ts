import type { FieldSelectOptions, FormObjectTab, FormSlice, ViewField, ViewTheme } from "./form-types.js";
import type { ZodType } from "zod";

/**
 * Configuración TS de `<abey-form>` (el schema Zod no puede declararse en HTML).
 */
export type AbeyFormConfig = {
  title: string;
  fields: ViewField[];
  tabs?: FormObjectTab[];
  /** Paginación solo para `fields` raíz (`0` = desactivada). */
  rootFieldsPageSize?: number;
  schema?: ZodType<Record<string, unknown>>;
  /**
   * Si no pasás `schema`, `<abey-form>` infiere validación básica desde `kind` y `optional`
   * (p. ej. `email` → formato válido, textos obligatorios → no vacío).
   * Poné `false` para conservar el comportamiento anterior (enviar sin Zod).
   * @default true cuando `schema` está ausente
   */
  inferBasicSchema?: boolean;
  showOptionalFieldsToggle?: boolean;
  initialValue?: Record<string, unknown>;
  mode?: FormSlice["mode"];
  /** Estado inicial del toggle “campos opcionales” (si `showOptionalFieldsToggle`). */
  includeOptionalFields?: boolean;
  resolveSelectOptions?: (opts: FieldSelectOptions) => Promise<Array<{ value: string; label: string }>>;
  /** Si no hay atributo `intentsubmit`, se puede fijar aquí. */
  submitIntent?: string;
  /** Clave bajo la que van los valores en el payload del intent (default `values`). */
  submitPayloadKey?: string;
  /** Texto del botón secundario que restaura `initialValue` y borra errores (p. ej. «Cancelar»). */
  resetButtonLabel?: string;
  /** Intent tras validación Zod fallida (payload: `{ fieldErrors, record }`). */
  invalidIntent?: string;
  /** Intent al pulsar Cancelar (payload: `{ values }` del estado reiniciado). */
  resetIntent?: string;
  /**
   * Tema del bloque (misma API que otros mounts). Para ancho completo del área de contenido:
   * `{ className: "abey-form--full" }` (ver `omega-default.css`).
   */
  theme?: ViewTheme;
};
