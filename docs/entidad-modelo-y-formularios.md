# Single entity (C#-style) → forms, validation, and JSON

For teams that **dislike** three parallel definitions of the same DTO (TypeScript table, form draft, hand-written Zod). Decorators live in `@abeyjs/uikit` and target “classic” flat-entity forms; if your screen is a document with lines (**invoice**, etc.), do not force this pattern—use dedicated meta like the billing examples in the repo.

With one **marker class** you get from a single file:

- **form UI** (`<abey-form>`)
- **validation** (Zod)
- **typed JSON** for API I/O
- **listing** (table) using the same model

Avoid duplication like:

- `type Entity` (table)
- `type EntityDraft` (form)
- per-screen manual validation

---

## 1) Entity (class) with decorators

Real example: `AlumnoEntity` in `examples/MyMiusic/src/ecosystems/alumnos/model/alumnos.types.ts`.

Main ideas:

- **UI + JSON fields**: normal class properties.
- **PK**: `@PrimaryKey()` (logical default `"id"` if unset).
- **API-only (no UI)**: `@Hidden()` (e.g. `id`).
- **Optional**: `@Optional()` (empty/undefined per type).

Decorators (from `@abeyjs/uikit`):

- `@FormModel({ title })`
- `@Label("...")`
- `@Required("...")`
- `@Regex(/.../, "...")`
- `@Email()`
- `@FormFieldKind("number" | "text" | "select" | ...)`
- `@Optional()`
- `@Hidden()`
- `@PrimaryKey()`

---

## 2) Auto-generate the form (`<abey-form>`)

From the class you get `AbeyFormConfig` (fields + schema):

```ts
import { classToAbeyFormConfig, AbeyFormElement } from "@abeyjs/uikit";
import { AlumnoEntity } from "./model/alumnos.types.js";

AbeyFormElement.define("abey-form");
const form = document.querySelector("abey-form")!;
form.config = classToAbeyFormConfig(AlumnoEntity);
```

`classToAbeyFormConfig(...)` yields:

- `fields: ViewField[]` (render)
- `schema: ZodType` (submit validation)

---

## 3) Typed / validated JSON for the API

Turn form or network input into valid typed JSON:

```ts
import { parseClassJson } from "@abeyjs/uikit";
import { AlumnoEntity } from "./model/alumnos.types.js";

const dto = parseClassJson(AlumnoEntity, input); // throws if invalid
// JSON.stringify(dto) → ready for API
```

**Zod schema only:**

```ts
import { classToSchema } from "@abeyjs/uikit";
const schema = classToSchema(AlumnoEntity);
```

---

## 4) Select / FK (static list or API)

### A) Static value/label list

```ts
import { SelectStatic, Optional } from "@abeyjs/uikit";

@SelectStatic([
  { value: "taylor", label: "Taylor Swift" },
  { value: "badbunny", label: "Bad Bunny" },
])
@Optional()
favoriteArtistId?: string;
```

### B) Via API (GET default, optional POST)

`@SelectApi(...)` defines **how** to load options:

```ts
import { SelectApi, Optional } from "@abeyjs/uikit";
import type { SelectApiOptions } from "@abeyjs/uikit";

@SelectApi({
  endpoint: "/genre",
  valueField: "id",
  labelField: "name",
  dataPath: "data",
} satisfies SelectApiOptions)
@Optional()
genreId?: string;
```

#### `dataPath`

Dot path inside JSON to the array:

- Response `{ "data": [ ... ] }` → `dataPath: "data"`
- Response `{ "result": { "rows": [ ... ] } }` → `dataPath: "result.rows"`

#### `method` and `body`

Default `method` is `"GET"`. For POST APIs:

```ts
@SelectApi({
  endpoint: "/genres/search",
  method: "POST",
  body: { query: "rock", page: 1, pageSize: 50 },
  valueField: "id",
  labelField: "name",
  dataPath: "data",
} satisfies SelectApiOptions)
```

---

## 5) Wire selects to the network via flow (Omega)

`<abey-form>` does not `fetch` by default—the app decides.

Recommended pattern:

- UI sets `cfg.resolveSelectOptions = async (opts) => ...`
- `resolveSelectOptions` fires an **intent** (`runtime.dispatch(intentOf(...))`)
- **Flow/agent** handles it with `OmegaHttp`
- Agent emits **event** `{ requestId, items }`
- `resolveSelectOptions` waits for that event and returns rows to the form

Example (Deezer genres) in this repo:

- `examples/MyMiusic/src/ecosystems/alumnos/ui/app-alumnos.ts` (`resolveSelectOptions`)
- `examples/MyMiusic/src/ecosystems/alumnos/omega/agent.ts` (`http.getJson` / `postJson`)
- `examples/MyMiusic/src/ecosystems/alumnos/omega/flow.ts` / `behavior.ts` / `register.ts`

---

## 6) PK (primary key)

Mark PK on entity:

```ts
@Hidden()
@PrimaryKey()
@Optional()
id?: string;
```

Read from code:

```ts
import { classPrimaryKey } from "@abeyjs/uikit";
const pk = classPrimaryKey(AlumnoEntity); // `"id"` if not declared
```
