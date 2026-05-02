import type { ZodType } from "zod";

/**
 * Metamodelo de formulario/listado (DOM en `@abeyjs/uikit`; `@abeyjs/view` reexporta para compatibilidad).
 */
export type FieldKind =
  | "text"
  | "number"
  | "email"
  | "date"
  | "file"
  | "select"
  | "readonly"
  | "checkbox"
  | "radio";

export interface FieldSelectOptions {
  endpoint: string;
  /** HTTP method (default GET). */
  method?: "GET" | "POST";
  /** Body para POST (si aplica). */
  body?: unknown;
  valueField: string;
  labelField: string;
  dataPath?: string;
}

export interface OpenApiCrudFieldUiOverride {
  source: string;
  label: string;
  kind: FieldKind;
  selectOptions?: FieldSelectOptions;
}

export type OpenApiCrudFieldUiOverrides = Record<string, OpenApiCrudFieldUiOverride>;

export interface ViewField {
  name: string;
  label: string;
  kind?: FieldKind;
  selectOptions?: FieldSelectOptions;
  /** `kind: "select"`: podés incluir `{ value: "", label: "…" }` si querés una fila explícita “sin valor” en el menú. */
  selectStaticItems?: Array<{ value: string; label: string }>;
  optional?: boolean;
  radioGroup?: string;
}

/**
 * Objeto anidado en el payload (`record[storeKey]`) renderizado en su propia pestaña (scroll interno).
 * Los `name` de los campos no deben contener `@@` (separador interno DOM/draft).
 */
export interface FormObjectTab {
  id: string;
  label: string;
  storeKey: string;
  fields: ViewField[];
}

export interface FormViewDef {
  kind: "form";
  title: string;
  schema?: ZodType<Record<string, unknown>>;
  fields: ViewField[];
  /** Objetos anidados: cada entrada = pestaña bajo los campos raíz. */
  tabs?: FormObjectTab[];
  /**
   * Si hay más campos raíz que este número, se reparten en páginas (navegación arriba del bloque).
   * Los `radio` con el mismo `radioGroup` van siempre en la misma página (no se parte el grupo).
   * Omitir o `0` = sin paginar.
   */
  rootFieldsPageSize?: number;
  showOptionalFieldsToggle?: boolean;
  /** Si tiene texto, el formulario muestra un botón `type="button"` antes de enviar (p. ej. «Cancelar»). */
  resetButtonLabel?: string;
}

export interface FormSlice {
  value: Record<string, unknown>;
  status: "idle" | "saving" | "error" | "success";
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
  mode?: "create" | "edit";
  includeOptionalFields?: boolean;
}

/** Tema visual (paridad con `@abeyjs/view` / `applyViewTheme`). */
export type ViewTheme = {
  className?: string;
  vars?: Partial<Record<string, string>>;
};
