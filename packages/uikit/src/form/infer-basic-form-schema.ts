import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from "zod";
import type { FormObjectTab, ViewField } from "./form-types.js";

function msg(label: string, text: string): string {
  const l = label.trim() || "Campo";
  return `${l}: ${text}`;
}

/**
 * Construye un Zod “razonable por defecto” a partir del metamodelo `ViewField`.
 * Objetivo: que el desarrollador no tenga que repetir email/min length en cada pantalla.
 */
export function zodForViewField(f: ViewField): ZodTypeAny {
  const label = f.label?.trim() || f.name;
  const optional = f.optional === true;
  const kind = f.kind ?? "text";

  if (kind === "checkbox") {
    const base = z.boolean();
    return optional ? base.optional() : base;
  }

  if (kind === "number") {
    const base = z.coerce.number().finite(msg(label, "número inválido"));
    return optional ? base.optional() : base;
  }

  if (kind === "email") {
    if (optional) {
      return z.union([z.literal(""), z.string().trim().email(msg(label, "email inválido"))]);
    }
    return z.string().trim().min(1, msg(label, "obligatorio")).email(msg(label, "email inválido"));
  }

  if (kind === "date") {
    const base = z.string().trim().min(1, msg(label, "obligatorio"));
    return optional ? z.union([z.literal(""), z.string().trim()]) : base;
  }

  if (kind === "select" || kind === "radio") {
    if (optional) {
      return z.union([z.literal(""), z.string().trim()]);
    }
    return z.string().trim().min(1, msg(label, "obligatorio"));
  }

  if (kind === "readonly") {
    return z.union([z.string(), z.number(), z.boolean(), z.null()]).optional();
  }

  if (kind === "file") {
    return z.instanceof(File).nullable().optional();
  }

  // text (default)
  if (optional) {
    return z.string().optional();
  }
  return z.string().trim().min(1, msg(label, "obligatorio"));
}

export type InferBasicFormSchemaInput = {
  fields: ViewField[];
  tabs?: FormObjectTab[];
};

/**
 * Schema plano + objetos anidados por pestaña (`storeKey`), con `.passthrough()` para
 * no romper extras (`storeExtra`, paths globales, etc.).
 */
export function inferBasicFormSchema(input: InferBasicFormSchemaInput): ZodObject<ZodRawShape> {
  const shape: ZodRawShape = {};

  for (const f of input.fields) {
    shape[f.name] = zodForViewField(f);
  }

  for (const tab of input.tabs ?? []) {
    const sk = tab.storeKey?.trim();
    if (!sk) continue;
    const inner: ZodRawShape = {};
    for (const f of tab.fields ?? []) {
      inner[f.name] = zodForViewField(f);
    }
    if (Object.keys(inner).length === 0) continue;
    shape[sk] = z.object(inner);
  }

  return z.object(shape).passthrough();
}
