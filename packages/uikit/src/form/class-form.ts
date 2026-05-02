import type { ZodRawShape, ZodTypeAny, ZodType } from "zod";
import { z } from "@abeyjs/validation";
import type { FieldKind, FieldSelectOptions, ViewField } from "./form-types.js";
import type { AbeyFormConfig } from "./abey-form.types.js";

type Ctor<T extends object = object> = new (...args: any[]) => T;

export type FormModelOptions = {
  title?: string;
};

export type FieldKindHint = FieldKind | "email";

type FieldRule =
  | { kind: "required"; message: string }
  | { kind: "regex"; pattern: RegExp; message: string }
  | { kind: "checkedTrue"; message: string };

type FieldMeta = {
  key: string;
  label?: string;
  kind?: FieldKindHint;
  optional?: boolean;
  /** Si true, no se renderiza como ViewField, pero sí puede existir en el schema/JSON. */
  hidden?: boolean;
  selectOptions?: FieldSelectOptions;
  selectStaticItems?: Array<{ value: string; label: string }>;
  radioGroup?: string;
  radioStaticItems?: Array<{ value: string; label: string }>;
  rules: FieldRule[];
};

type ClassMeta = {
  model?: FormModelOptions;
  /** Campo PK lógico (ej: "id"). */
  primaryKey?: string;
  /** Order of first-seen fields (stable). */
  order: string[];
  fields: Map<string, FieldMeta>;
};

const META = new WeakMap<Function, ClassMeta>();

function metaOf(ctor: Function): ClassMeta {
  const cur = META.get(ctor);
  if (cur) return cur;
  const next: ClassMeta = { order: [], fields: new Map() };
  META.set(ctor, next);
  return next;
}

function fieldOf(ctor: Function, key: string): FieldMeta {
  const m = metaOf(ctor);
  const prev = m.fields.get(key);
  if (prev) return prev;
  const next: FieldMeta = { key, rules: [] };
  m.fields.set(key, next);
  if (!m.order.includes(key)) m.order.push(key);
  return next;
}

function keyToLabel(key: string): string {
  const raw = key.trim();
  if (!raw) return "Campo";
  const spaced = raw
    .replace(/[_\s]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function applyRequired(base: ZodTypeAny, message: string, kind: FieldKindHint | undefined): ZodTypeAny {
  const msg = String(message ?? "").trim() || "Obligatorio";
  if (kind === "number") {
    // For number, "required" is already represented by the coercion + finite check.
    return base;
  }
  if (kind === "checkbox") {
    return base;
  }
  if (kind === "file") {
    return base;
  }
  // Default string-like
  return (base as any).min?.(1, msg) ?? base;
}

function baseZodFor(kind: FieldKindHint | undefined, label: string): ZodTypeAny {
  const l = label.trim() || "Campo";
  if (kind === "number") {
    return z.coerce.number().finite(`${l}: número inválido`);
  }
  if (kind === "email") {
    return z.string().trim().email(`${l}: correo inválido`);
  }
  if (kind === "checkbox") {
    // DOM checkboxes often arrive as: true/false, "on"/"", "true"/"false", 1/0.
    // We coerce common representations to boolean BEFORE validation rules (e.g. @Checked).
    return z.preprocess((v) => {
      if (v === true || v === false) return v;
      if (v == null) return false;
      if (typeof v === "number") return v === 1;
      if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (!s) return false;
        if (s === "on" || s === "true" || s === "1" || s === "yes" || s === "si") return true;
        if (s === "off" || s === "false" || s === "0" || s === "no") return false;
      }
      // Fallback: any truthy value -> true
      return Boolean(v);
    }, z.boolean());
  }
  if (kind === "file") {
    return z.instanceof(File).nullable();
  }
  // select/date/radio/readonly/text -> string
  return z.string().trim();
}

function toViewKind(kind: FieldKindHint | undefined): FieldKind {
  if (kind === "email") return "email";
  return (kind as FieldKind) ?? "text";
}

function schemaForField(f: FieldMeta): ZodTypeAny {
  const label = f.label?.trim() || keyToLabel(f.key);
  const kind = f.kind;

  let zod: ZodTypeAny;
  if (kind === "radio" && Array.isArray(f.radioStaticItems) && f.radioStaticItems.length > 0) {
    const vals = f.radioStaticItems.map((i) => String(i.value)).filter(Boolean);
    zod = vals.length ? z.enum(vals as [string, ...string[]], { message: `${label}: obligatorio` }) : z.string().trim();
  } else {
    zod = baseZodFor(kind, label);
  }

  // Normalize decorator execution order (legacy TS calls bottom-up):
  // we stored rules with `unshift`, so here we can apply in array order (top-down).
  const rules = f.rules;
  for (const r of rules) {
    if (r.kind === "required") {
      zod = applyRequired(zod, r.message, kind);
      continue;
    }
    if (r.kind === "regex") {
      const msg = String(r.message ?? "").trim() || `${label}: formato inválido`;
      zod = (zod as any).regex?.(r.pattern, msg) ?? zod;
      continue;
    }
    if (r.kind === "checkedTrue") {
      const msg = String(r.message ?? "").trim() || `${label}: debe estar marcado`;
      zod = (zod as any).refine?.((v: unknown) => v === true, msg) ?? zod;
    }
  }

  const optional = f.optional === true;
  if (!optional) return zod;

  // Optional normalization aligned with `inferBasicFormSchema` behavior.
  if (kind === "email") {
    return z.union([z.literal(""), z.string().trim().email(`${label}: correo inválido`)]);
  }
  if (kind === "select" || kind === "radio" || kind === "date") {
    return z.union([z.literal(""), z.string().trim()]);
  }
  if (kind === "number") {
    return (zod as any).optional?.() ?? zod;
  }
  return (zod as any).optional?.() ?? zod;
}

export function FormModel(opts?: FormModelOptions): ClassDecorator {
  return (target) => {
    const ctor = target as Function;
    const m = metaOf(ctor);
    m.model = { ...(m.model ?? {}), ...(opts ?? {}) };
  };
}

export function Label(text: string): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.label = String(text ?? "").trim();
  };
}

export function FormFieldKind(kind: FieldKindHint): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.kind = kind;
  };
}

export function Email(): PropertyDecorator {
  return FormFieldKind("email");
}

export type SelectStaticItem = { value: string; label: string };

export type SelectApiOptions = FieldSelectOptions;

/** Renderiza un `<select>` con items hardcodeados (value/label). */
export function SelectStatic(items: SelectStaticItem[]): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.kind = "select";
    f.selectStaticItems = Array.isArray(items) ? items.map((i) => ({ value: String(i.value), label: String(i.label) })) : [];
  };
}

/** Renderiza un `<select>` resolviendo items desde API (Omega resolver) en `<abey-form>`. */
export function SelectApi(opts: SelectApiOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.kind = "select";
    f.selectOptions = { ...opts };
  };
}

/** Renderiza un checkbox (`boolean`). */
export function Checkbox(): PropertyDecorator {
  return FormFieldKind("checkbox");
}

/** Para checkbox: exige que sea `true`. */
export function Checked(message = "Debe estar marcado"): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.kind = "checkbox";
    f.rules.unshift({ kind: "checkedTrue", message: String(message ?? "").trim() });
  };
}

export type RadioStaticItem = { value: string; label: string };

/** Renderiza un grupo de radios con opciones estáticas. Guarda el valor en el `key` del campo. */
export function RadioStatic(items: RadioStaticItem[], opts?: { group?: string }): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.kind = "radio";
    f.radioGroup = String(opts?.group ?? key).trim() || key;
    f.radioStaticItems = Array.isArray(items)
      ? items.map((i) => ({ value: String(i.value), label: String(i.label) }))
      : [];
  };
}

export function Optional(): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.optional = true;
  };
}

/** Campo presente en JSON/schema pero no renderizado en el formulario. Útil para `id`. */
export function Hidden(): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.hidden = true;
  };
}

/** Marca el campo como PK lógico (ej: `id`). */
export function PrimaryKey(): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    metaOf(ctor).primaryKey = key;
    fieldOf(ctor, key); // asegurar que exista en el orden/meta
  };
}

export function classPrimaryKey<T extends object>(ctor: Ctor<T>): string {
  const m = metaOf(ctor);
  return (m.primaryKey ?? "").trim() || "id";
}

export function Required(message: string): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    // TS legacy executes decorators bottom-up; unshift preserves author order top-down.
    f.rules.unshift({ kind: "required", message: String(message ?? "").trim() });
  };
}

export function Regex(pattern: RegExp, message: string): PropertyDecorator {
  return (target, propertyKey) => {
    const ctor = (target as any)?.constructor as Function | undefined;
    if (!ctor) return;
    const key = String(propertyKey);
    const f = fieldOf(ctor, key);
    f.rules.unshift({
      kind: "regex",
      pattern,
      message: String(message ?? "").trim(),
    });
  };
}

export type ClassToAbeyFormConfigOptions = {
  title?: string;
};

function classToZodObject<T extends object>(
  ctor: Ctor<T>,
): ZodType<Record<string, unknown>> {
  const m = metaOf(ctor);
  const shape: ZodRawShape = {};

  for (const key of m.order) {
    const fm = m.fields.get(key);
    if (!fm) continue;
    shape[key] = schemaForField(fm) as ZodTypeAny;
  }

  return z.object(shape).passthrough();
}

export function classToSchema<T extends object>(ctor: Ctor<T>): ZodType<Record<string, unknown>> {
  return classToZodObject(ctor as any);
}

export function parseClassJson<T extends object>(ctor: Ctor<T>, input: unknown): T {
  return classToZodObject(ctor as any).parse(input) as unknown as T;
}

export function classToAbeyFormConfig<T extends object>(
  ctor: Ctor<T>,
  opts?: ClassToAbeyFormConfigOptions,
): AbeyFormConfig {
  const m = metaOf(ctor);
  const title = String(opts?.title ?? m.model?.title ?? keyToLabel(ctor.name ?? "Formulario")).trim() || "Formulario";

  const fields: ViewField[] = [];
  for (const key of m.order) {
    const fm = m.fields.get(key);
    if (!fm || fm.hidden === true) continue;
    const label = fm.label?.trim() || keyToLabel(key);
    const kind = toViewKind(fm.kind);
    if (kind === "radio" && Array.isArray(fm.radioStaticItems) && fm.radioStaticItems.length > 0) {
      const group = (fm.radioGroup ?? key).trim() || key;
      for (const it of fm.radioStaticItems) {
        fields.push({
          name: String(it.value),
          label: String(it.label),
          kind: "radio",
          radioGroup: group,
          optional: fm.optional === true,
        });
      }
      continue;
    }
    fields.push({
      name: key,
      label,
      kind,
      optional: fm.optional === true,
      selectOptions: fm.selectOptions,
      selectStaticItems: fm.selectStaticItems,
    });
  }

  const schema: ZodType<Record<string, unknown>> = classToZodObject(ctor as any);
  return {
    title,
    fields,
    schema,
    inferBasicSchema: false,
  };
}

