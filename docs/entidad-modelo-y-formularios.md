# Entidad única (estilo C#) → Formularios, validación y JSON

AbeyJs permite definir una **sola entidad** (una clase) y reutilizarla para:

- **UI de formulario** (`<abey-form>`)
- **validación** (Zod)
- **JSON** para enviar/recibir del API (tipado)
- **listado** (tabla) usando el mismo modelo

La idea es evitar duplicación tipo:

- `type Entity` (tabla)
- `type EntityDraft` (form)
- validación manual por pantalla

---

## 1) La entidad (clase) con decoradores

Ejemplo real en el repo: `AlumnoEntity` en `examples/MyMiusic/src/ecosystems/alumnos/model/alumnos.types.ts`.

Conceptos principales:

- **Campos de UI + JSON**: propiedades normales de la clase.
- **PK**: `@PrimaryKey()` (default lógico `"id"` si no se marca).
- **Campos solo API (no UI)**: `@Hidden()` (ej. `id`).
- **Opcional**: `@Optional()` (permite vacío/undefined según el tipo).

Decoradores disponibles (exportados desde `@abeyjs/uikit`):

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

## 2) Generar el formulario automáticamente (`<abey-form>`)

Con la clase, se genera un `AbeyFormConfig` (fields + schema):

```ts
import { classToAbeyFormConfig, AbeyFormElement } from "@abeyjs/uikit";
import { AlumnoEntity } from "./model/alumnos.types.js";

AbeyFormElement.define("abey-form");
const form = document.querySelector("abey-form")!;
form.config = classToAbeyFormConfig(AlumnoEntity);
```

`classToAbeyFormConfig(...)` genera:

- `fields: ViewField[]` (para render)
- `schema: ZodType` (para validar al submit)

---

## 3) JSON tipado/validado para enviar al API

Si querés transformar un input (del form o de red) en un JSON válido y tipado:

```ts
import { parseClassJson } from "@abeyjs/uikit";
import { AlumnoEntity } from "./model/alumnos.types.js";

const dto = parseClassJson(AlumnoEntity, input); // lanza si es inválido
// JSON.stringify(dto) → listo para API
```

Si solo querés el **schema Zod**:

```ts
import { classToSchema } from "@abeyjs/uikit";
const schema = classToSchema(AlumnoEntity);
```

---

## 4) Select/FK (lista dura o por API)

### A) Lista dura (value/label)

```ts
import { SelectStatic, Optional } from "@abeyjs/uikit";

@SelectStatic([
  { value: "taylor", label: "Taylor Swift" },
  { value: "badbunny", label: "Bad Bunny" },
])
@Optional()
artistaFavoritoId?: string;
```

### B) Por API (GET por defecto, POST opcional)

`@SelectApi(...)` define **cómo** obtener opciones:

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
generoId?: string;
```

#### `dataPath`

Es la ruta (con puntos) dentro del JSON donde vive el array:

- Respuesta: `{ "data": [ ... ] }` → `dataPath: "data"`
- Respuesta: `{ "result": { "rows": [ ... ] } }` → `dataPath: "result.rows"`

#### `method` y `body`

Por defecto `method` es `"GET"`. Si tu API requiere POST:

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

## 5) Conectar selects a red vía Flow (Omega)

`<abey-form>` no hace `fetch` directo por default: la app decide.

Patrón recomendado:

- UI define `cfg.resolveSelectOptions = async (opts) => ...`
- `resolveSelectOptions` dispara un **intent** (`runtime.dispatch(intentOf(...))`)
- El **Flow/Agent** consume ese intent y usa `OmegaHttp` para consultar red
- El Agent emite un **event** con `{ requestId, items }`
- `resolveSelectOptions` espera ese event y retorna la lista al form

Ejemplo en este repo (géneros Deezer) vive en:

- `examples/MyMiusic/src/ecosystems/alumnos/ui/app-alumnos.ts` (resolveSelectOptions)
- `examples/MyMiusic/src/ecosystems/alumnos/omega/agent.ts` (http.getJson/postJson)
- `examples/MyMiusic/src/ecosystems/alumnos/omega/flow.ts` / `behavior.ts` / `register.ts`

---

## 6) PK (primary key)

Marcá el PK en la entidad:

```ts
@Hidden()
@PrimaryKey()
@Optional()
id?: string;
```

Y podés consultarlo desde código:

```ts
import { classPrimaryKey } from "@abeyjs/uikit";
const pk = classPrimaryKey(AlumnoEntity); // "id" si no se marcó
```

