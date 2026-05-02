# `abey-table` with flows

When the table must **talk to Omega** (columns and actions arrive on the channel; user actions return as intents), enable flow mode. Pattern used in demos where an agent publishes `tableColumns` / `tableItems` and the grid fires `intentload` on pagination without every screen calling `fetch` directly.

This doc covers **only** DOM contract / attributes / expected payloads; flow logic lives in your `omega/` modules.

## Flow mode (`flow="true"`)

`flow="true"` turns on:

- listen for runtime events and apply **columns / actions / items**
- emit intents on pagination / selection / actions

### Attributes

- **`flow="true"`**
- **`runtimepath="__abeyRuntime"`** *(optional; default `globalThis.__abeyRuntime`)*
- **`intentload="Music/TableLoad"`**
- **`intentselection="Music/TableSelection"` *(optional)*
- **`intentaction="Music/TableAction"` *(optional)*
- **`eventcolumns="omega/.../tableColumns"`**
- **`eventactions="omega/.../tableActions"` *(optional)*
- **`eventitems="omega/.../tableItems"`**
- **`loadnetwork="true"`** (table fires `intentload` when `page` / `pageSize` change)

### Payloads (flow → UI)

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

## `abey.json` (global styles)

If `abey.json` exists at the Vite project root (next to `vite.config.ts`), `abeyVitePlugin()` injects `styles`:

```json
{
  "styles": ["@abeyjs/uikit/styles/abey-table.css"]
}
```
