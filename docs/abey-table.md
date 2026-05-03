# `abey-table` (UI kit)

Use this web component for a **dense grid** product-console style (row selection, action menu, pagination) **without** full `mountListViewSync` for a mock or live catalog. Plays with the rest of AbeyJs: drive from plain TS state or wire the runtime in **flow** mode (see **`/guides/table-flows`**).

Register the class once at startup (`AbeyTableElement.define("abey-table")`)—the kit does not assume the custom element already exists. Prefer **`registerAbeyJsUi()`** from **`@abeyjs/view`** in **`main.ts`** so all **`abey-*`** primitives (including **`abey-table`**) define together.

### Omega runtime on `globalThis` (flow mode and intents)

In **flow** mode (and whenever the grid calls **`dispatch`** on the OM runtime), **`abey-table`** looks up **`OmegaRuntime`** from **`globalThis`** using the **`runtime-path`** attribute (DOM: **`runtimepath`**). Default path is **`"__abeyRuntime"`** — i.e. **`globalThis.__abeyRuntime`**.

**`bootstrapOmegaApp(root, { createOmega, … })`** (see **`packages/view` README**) resolves **`createOmega()`** then calls **`exposeBootstrapRuntime`**, which sets **`globalThis.__abeyRuntime`** and (**if absent**) **`globalThis.__abeyDi.channel`**. That avoids repeating glue in each app’s **`main.ts`**.

**Separate concerns:**

| Requirement | Responsibility |
|-------------|----------------|
| Custom element **`abey-table`** exists | **`registerAbeyJsUi()`** / **`AbeyTableElement.define`** once at startup |
| **`globalThis.__abeyRuntime`** set | **`bootstrapOmegaApp`** + **`createOmega`** ( **`exposeBootstrapRuntime`** ) |
| Columns / items / intents | Your OM handlers, **`channel.publish`**, slice installers |
| Styles | Document / light DOM: **`abey.json`** → **`styles`** or **`import "@abeyjs/uikit/styles/abey-table.css"`** at app entry. Inside **`@AbeyComponent`** (shadow root), global sheets **do not** reach **`<abey-table>`**: add **`import tableCss from ".../abey-table.css?inline"`** to **`stylesText`** on that component. |

If **`#getRuntime()`** returns **`null`** (empty table chrome, **`channel`** never attaches), **`createOmega`** is missing, bootstrap never ran yet, or you are on a **public-only** page that never mounts the routed shell—in those cases **`globalThis.__abeyRuntime`** stays unset until the main app bootstrap completes.

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
