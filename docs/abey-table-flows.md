# `abey-table` con Flows

Este documento describe el modo “flow-aware” de `abey-table`.

## Modo Flow (`flow="true"`)

`flow="true"` activa el modo:

- escucha eventos del runtime y aplica **columns / actions / items**
- emite intents al runtime al paginar/seleccionar/acciones

### Atributos

- **`flow="true"`**
- **`runtimepath="__abeyRuntime"`** *(opcional; default `globalThis.__abeyRuntime`)*
- **`intentload="Music/TableLoad"`**
- **`intentselection="Music/TableSelection"` *(opcional)*
- **`intentaction="Music/TableAction"` *(opcional)*
- **`eventcolumns="omega/.../tableColumns"`**
- **`eventactions="omega/.../tableActions"` *(opcional)*
- **`eventitems="omega/.../tableItems"`**
- **`loadnetwork="true"`** (para que la tabla dispare `intentload` al cambiar `page/pageSize`)

### Payloads (Flow → UI)

`eventcolumns` payload:

```json
{
  "columns": [
    { "key": "code", "header": "", "width": "120px", "frozen": "left" },
    { "key": "submitter", "header": "Submitter", "width": "220px", "render": "submitter" }
  ]
}
```

`eventactions` payload:

```json
{
  "actions": [
    { "id": "open", "label": "Open" },
    { "id": "delete", "label": "Delete" }
  ]
}
```

`eventitems` payload:

```json
{
  "items": [],
  "totalItems": 57,
  "page": 1,
  "pageSize": 10
}
```

## `abey.json` (estilos globales)

Si existe `abey.json` en la raíz del proyecto Vite (donde está `vite.config.ts`), `abeyVitePlugin()` inyecta automáticamente los `styles`:

```json
{
  "styles": ["@abeyjs/uikit/styles/abey-table.css"]
}
```

