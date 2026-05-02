/**
 * Data-driven **view schema** — list definitions live here; **form** field types **`FormViewDef` / `ViewField`** are re-exported from **`@abeyjs/uikit`** for a single import site.
 */
export type {
  FieldKind,
  FieldSelectOptions,
  OpenApiCrudFieldUiOverride,
  OpenApiCrudFieldUiOverrides,
  ViewField,
  FormViewDef,
  FormSlice,
} from "@abeyjs/uikit";

import type { ViewField, FormViewDef } from "@abeyjs/uikit";

export interface ListViewDef {
  kind: "list";
  title: string;
  rowKey: string;
  fields: ViewField[];
}

export type DataViewDef = ListViewDef | FormViewDef;

export interface ListSlice<T extends Record<string, unknown> = Record<string, unknown>> {
  rows: T[];
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  serverPaging?: boolean;
}
