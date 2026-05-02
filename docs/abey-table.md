# `abey-table` (UI kit)

Use this web component for a **dense grid** product-console style (row selection, action menu, pagination) **without** full `mountListViewSync` for a mock or live catalog. Plays with the rest of AbeyJs: drive from plain TS state or wire the runtime in **flow** mode (see **`/guides/table-flows`**).

Register the class once at startup (`AbeyTableElement.define("abey-table")`)—the kit does not assume the custom element already exists.

## What you get out of the box

Table web component with:

- selection (`checkbox`)
- per-row actions (menu)
- pagination (`page`, `pageSize`, `pageSizes`)
- left/right **frozen** columns (`frozen`)

## Basic usage (no flows)

```html
<abey-table selectable pagesizes="10,20,30" pagesize="10" page="1"></abey-table>
```

Then in TS:

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

## Props / config (TS)

`table.config`:

- **rows**: `Row[]`
- **columns**: `Array<{ key, header, width?, align?, frozen?, render?, value? }>`
  - **frozen**: `"left" | "right"`
  - **width** in `px` recommended with `frozen` (offset math)
- **actions**: `Array<{ id, label, eventName?, onSelect? }>`
- **selectable**: `boolean`
- **getRowId**: `(row) => string`

Renderers:

- **`table.renderers`**: registry by key.  
  Example: column `render: "submitter"` resolves via `table.renderers.submitter`.

## HTML attributes

Pagination:

- **`page`**: number (1-based)
- **`pagesize`**: number
- **`pagesizes`**: `"10,20,30"` (CSV)
- **`totalitems`**: number (optional)

Flags:

- **`selectable`**
- **`dense`**

## DOM events

- **`selectionchange`**: `detail = { selectedIds: Set<string>, selectedItems: Row[] }`
- **`actionClick`**: `detail = { actionId, rowId, row }` (cancelable)
- **`loadNetwork`**: `detail = { page, pageSize }` *(only if `loadnetwork="true"`)*
