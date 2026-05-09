# `@abeyjs/uikit`

AbeyJs **UI kit**: **`abey-*` custom elements** (inputs, select, checkbox, radio, button, form shell, table, line items), **imperative mount helpers** (**`mountFormView`**, **`mountTextInputField`**, …), **`FormViewDef`**-driven layouts, **`abey-table`**, reactive **draft** utilities, **`configpath`** **global registry**, and decorators / class-metadata → **`AbeyFormConfig`**.

Depends on **`@abeyjs/core`**, **`@abeyjs/runtime`**, **`@abeyjs/validation`**, **`@abeyjs/state`**.

**Peer:** **`zod`** (^3.24) — **optional** (**`peerDependenciesMeta`**) unless you import schema inference (**`inferBasicFormSchema`**, **`classToSchema`**, line-item Zod helpers).

**Custom element definitions:** register tags once via **`registerAbeyJsUi()`** from **`@abeyjs/view`** (includes **`abey-*`** primitives + **`abey-widget`** + **`abey-provide`**). Apps that only import mount helpers still need **`define()`** somewhere — prefer **`registerAbeyJsUi()`** in **`main.ts`**.

---

## Install

```bash
npm install @abeyjs/uikit zod   # zod recommended if you use class-form / Zod inference
```

---

## Package exports (`package.json`)

| Import path | Contents |
|-------------|-----------|
| **`@abeyjs/uikit`** | Full barrel — see [Main barrel](#main-barrel) below. |
| **`@abeyjs/uikit/styles/abey-table.css`** | **`abey-table`** layout / chrome (static file alongside **`dist`**). Import in **`abey.json` `styles`**, **`main.ts`**, or **`stylesText`** inside shadow OM. |
| **`@abeyjs/uikit/form-types`** | **`FormViewDef`**, **`FormSlice`**, **`ViewField`**, **`ViewTheme`**, OpenAPI CRUD overrides — types only. |
| **`@abeyjs/uikit/mount-form`** | **`mountFormView`**, **`createOmegaFormSurface`**, **`applyViewTheme`** — tree-shake form mounting without importing every control file. |
| **`@abeyjs/uikit/abey-form-classes`** | **`ABEY`**, **`ABEY_TAG`** — BEM-ish class map + CE tag constants. |
| **`@abeyjs/uikit/dialog/abey-dialog`** | **`AbeyDialogElement`** — premium animated modal dialog component. |
| **`@abeyjs/uikit/checkbox`**, **`/radio`**, **`/select`**, **`/input`** | Narrow barrels: **`mount*Field`** + **`ensureAbey*Defined`** (+ element export). |

**`sideEffects`: `false`** — safe for bundlers when using subpaths.

---

## Main barrel (**`src/index.ts`**)

Rough groupings:

| Area | Symbols (representative) |
|------|---------------------------|
| **Controls** | **`AbeyInputElement`**, **`AbeySelectElement`**, **`AbeyCheckboxElement`**, **`AbeyRadioElement`**, **`mountTextInputField`**, **`mountSelectField`**, **`mountCheckboxField`**, **`mountRadioField`**, **`ensure*Defined`** |
| **Dialog** | **`AbeyDialogElement`** (modal, closable, maximizable, breakpoints) |
| **Button** | **`AbeyButtonElement`**, **`createOmegaButton`** |
| **Forms** | **`AbeyFormElement`**, **`mountFormView`**, **`createOmegaFormSurface`**, **`applyViewTheme`**, **`mountIntentButton`**, **`moveAbeyFormActionsIntoTabShell`**, **`slotHostIntoAbeyFormTabPanel`**, **`restoreAbeyFormHostToPool`** |
| **Class / decorators** | **`FormModel`**, **`parseClassJson`**, **`classToAbeyFormConfig`**, **`classToSchema`**, field decorators (**`PrimaryKey`**, **`SelectApi`**, …) |
| **Schema inference** | **`inferBasicFormSchema`**, **`zodForViewField`** (needs **Zod** in bundle) |
| **Line items** | **`AbeyLineItemsElement`**, **`mountLineItemsTable`**, **`lineItemsColumnsFromGenerated`**, **`createLineItemsEmptyRow`**, **`createLineItemsRowSchema`** |
| **Lookups** | **`mapJsonToFieldSelectItems`**, **`resolveFieldSelectOptionsFromFetch`** (+ **`DynamicCrudAgent`** pairing in **`@abeyjs/openapi`**) |
| **Reactive draft** | **`FormStore`**, **`lens`**, **`bindTextInput`**, **`bindNumberInput`**, **`attachAsyncValidator`**, **`wireNativeFormDraft`** |
| **Registry** | **`setGlobalRegistry`**, **`getGlobalRegistry`**, **`setGlobalRegistryPath`**, **`getGlobalRegistryPath`** — **`globalThis`** lookups for **`configpath="registry.path"`** style wiring |
| **Table** | **`AbeyTableElement`**, **`createAbeyTable`**, **`avatar`**, **`statusPill`** (+ **`AbeyTable*`** types). Styles: **`styles/abey-table.css`**. |

**`mountFormView` / `createOmegaFormSurface` / `mountIntentButton`** are also re-exported from **`@abeyjs/view`** for convenience beside **`mountListView`**.

---

## Web components & CSS

- Each family exposes **`define("abey-*")`**-style helpers (for example **`ensureAbeySelectElementDefined`**) alongside the element class such as **`AbeySelectElement`**.
- Shared tag names **`ABEY_TAG`** prevent string typos in templates.
- **`abey-table`** needs its CSS in scope (light DOM globals or **`?inline`** in **`@AbeyComponent`** shadow roots). Behaviour and attrs: **`docs/abey-table.md`**.

---

## Forms (declarative)

**`FormViewDef`** + **`StateCell`** + **`OmegaRuntime`**: **`mountFormView`** binds subscription, validates with **`FormViewDef.schema`** (**`@abeyjs/validation`**), emits **`onValid`**; **`resolveSelectOptions`** / lookups integrate with **`FieldSelectOptions`**.

**`createOmegaFormSurface`** renders **`abey-form`** shell sections; callers own **`update(vs)`** and placement.

---

## Build

```bash
npm run build -w @abeyjs/uikit
```

---

## Related docs

- **Table**: **`docs/abey-table.md`**, **`docs/abey-table-flows.md`** (monorepo).
- **Shell / routing / `registerAbeyJsUi`**: **`@abeyjs/view` README**.
- **OpenAPI CRUD UI**: **`@abeyjs/openapi` README**.
- **Security (sanitized HTML)**: **`@abeyjs/view`** **`safe-html`**, **`docs/security-omegax.md`**.
