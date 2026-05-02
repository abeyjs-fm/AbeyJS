# `abey-table` (AbeyJs UI Kit)

Web Component para tablas con:

- selección (`checkbox`)
- acciones por fila (menú)
- paginación (`page`, `pageSize`, `pageSizes`)
- columnas “freeze” izquierda/derecha (`frozen`)

## Uso básico (sin flows)

```html
<abey-table selectable pagesizes="10,20,30" pagesize="10" page="1"></abey-table>
```

Luego en TS:

```ts
import { AbeyTableElement } from "@abeyjs/uikit";
AbeyTableElement.define("abey-table");

const table = document.querySelector("abey-table") as AbeyTableElement<any>;
table.config = {
  rows: [],
  columns: [],
  actions: [],
  selectable: true,
  getRowId: (r) => String(r.id),
};
```

## Props/Config (TS)

`table.config`:

- **rows**: `Row[]`
- **columns**: `Array<{ key, header, width?, align?, frozen?, render?, value? }>`
  - **frozen**: `"left" | "right"`
  - **width** recomendado en `px` cuando usas `frozen` (para calcular offsets)
- **actions**: `Array<{ id, label, eventName?, onSelect? }>`
- **selectable**: `boolean`
- **getRowId**: `(row) => string`

Renderers:

- **`table.renderers`**: registry de renderers por key.  
  Ej: una columna puede usar `render: "submitter"` y la tabla lo resuelve con `table.renderers.submitter`.

## Atributos HTML

Paginación:

- **`page`**: número (1-based)
- **`pagesize`**: número
- **`pagesizes`**: `"10,20,30"` (CSV)
- **`totalitems`**: número (opcional)

Flags:

- **`selectable`**
- **`dense`**

## Eventos DOM

- **`selectionchange`**: `detail = { selectedIds: Set<string>, selectedItems: Row[] }`
- **`actionClick`**: `detail = { actionId, rowId, row }` (cancelable)
- **`loadNetwork`**: `detail = { page, pageSize }` *(solo si `loadnetwork="true"`)*

