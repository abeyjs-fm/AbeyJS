# `@abeyjs/validation`

Thin **Zod** facade for AbeyJs: re-exports **`z`** plus **`safeParseWithErrors`** and helpers that turn **`ZodIssue`** lists into **`Record<string, string>`** maps for forms (`@abeyjs/uikit`), OpenAPI-derived schemas, or any caller that prefers a **`success | fields`** discriminant instead of raw **`ZodError`**.

---

## Dependencies

 **`zod`** is a **peer dependency** (^3.24). Consumers must install **`zod`** in the app/package that imports **`@abeyjs/validation`**.

---

## API

| Export | Role |
|--------|------|
| **`z`**, **`ZodType`**, **`ZodSchema`** | Same **`zod`** surface (shared rules between UI and optional server validation). |
| **`FieldError`** | `{ path, message }` — stable intermediary before UI maps. |
| **`safeParseWithErrors`** | **`schema.safeParse`**, branching to **`fields: FieldError[]`** when invalid. |
| **`fieldErrorsToMap`** | First path segment only → flat **`{ [field]: message }`** (first issue wins per top-level key). |
| **`fieldErrorsToDottedMap`** | Full path joined with **`.`** (e.g. **`client.email`**) for nested payloads. |

**Note:** **`fieldErrorsToMap`** ignores deeper path segments after the first — use **`fieldErrorsToDottedMap`** when **`ViewField.name`** matches dotted keys or nested object shapes.

---

## Typical use

```ts
import { z, safeParseWithErrors, fieldErrorsToMap } from "@abeyjs/validation";

const User = z.object({ name: z.string().min(1), age: z.coerce.number() });

const r = safeParseWithErrors(User, { name: "", age: "x" });
if (!r.success) {
  const byField = fieldErrorsToMap(r.fields); // { name: '...', age: '...' }
}
```

---

## Build

```bash
npm run build -w @abeyjs/validation
```
