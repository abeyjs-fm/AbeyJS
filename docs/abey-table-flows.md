# `abey-table` with flows

When the table must **use the runtime channel** (columns and actions arrive on the channel; user actions return as intents), enable flow mode. Pattern used in demos where an agent publishes `tableColumns` / `tableItems` and the grid fires `intentload` on pagination without every screen calling `fetch` directly.

This doc covers **only** DOM contract / attributes / expected payloads; flow logic lives in your domain/agent modules beside the OM views.

## Prerequisites: `globalThis.__abeyRuntime`

**Flow mode** subscribes to **`runtime.channel.onAll`** and emits intents via **`runtime.dispatch`** (see **`#attachFlow`** in **`@abeyjs/uikit`** **`abey-table`**). The element resolves **`OmegaRuntime`** by walking **`globalThis`** from **`runtimepath`** (default **`"__abeyRuntime"`**).

1. **Bootstrap:** call **`bootstrapOmegaApp`** with **`createOmega`** from your **`omegaSetup`**. That path runs **`exposeBootstrapRuntime`**, which assigns **`globalThis.__abeyRuntime`** (and default **`__abeyDi.channel`** when missing). No extra **`main.ts`** assignment is required for standard **empty** / **admin** templates.
2. **Custom element:** call **`registerAbeyJsUi()`** (or **`AbeyTableElement.define("abey-table")`**) before the table appears in the DOM — globals alone do not register the tag.
3. **Public-only pages:** if the user never hits the routed shell bootstrap, **`__abeyRuntime`** may stay unset until the app mounts — the table will not attach **`channel`** listeners until **`exposeBootstrapRuntime`** has run.

Detailed overview of **`runtimepath`** / **`exposeBootstrapRuntime`**: **`docs/abey-table.md`** § *Omega runtime on `globalThis`*.

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
- **`eventcolumns="MySlice/events/…/tableColumns"`** *(topic strings match what your handlers publish)*
- **`eventactions="MySlice/events/…/tableActions"` *(optional)*
- **`eventitems="MySlice/events/…/tableItems"`**
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
