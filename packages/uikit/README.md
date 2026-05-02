# `@abeyjs/uikit`

AbeyJs **UI Kit**: **`abey-*` custom elements**, imperative **mount helpers** (`mountTextInputField`, `mountFormView`, …), **`FormViewDef`-driven** surfaces, **`abey-table`**, reactive **form draft** primitives, and a tiny **global registry** for declarative `configpath=` wiring.

Depends on **`@abeyjs/core`**, **`@abeyjs/runtime`**, **`@abeyjs/validation`**, **`@abeyjs/state`**. **`zod`** is a **peer** (optional in `peerDependenciesMeta`); class-based form helpers assume it when you import schema builders.

---

## Package entry points (`package.json` `exports`)

| Import | Contents |
|--------|----------|
| **`@abeyjs/uikit`** | Main barrel — components, **`mountFormView`**, table, reactive draft, registry, lookup helpers (see **`src/index.ts`**). |
| **`@abeyjs/uikit/form-types`** | **`FormViewDef`**, **`ViewField`**, themes, slices — typings without dragging DOM code. |
| **`@abeyjs/uikit/mount-form`** | **`mountFormView`**, **`createOmegaFormSurface`**, **`applyViewTheme`** (for tree-shaken form mounting). |
| **`@abeyjs/uikit/abey-form-classes`** | **`ABEY`** / **`ABEY_TAG`** CSS and custom-element tag constants. |
| **`@abeyjs/uikit/form-field-ui-types`** | Internal-ish field UI **`OmegaFormFieldUi`** contract. |
| **`@abeyjs/uikit/checkbox`**, **`/radio`**, **`/select`**, **`/input`** | Scoped barrels for **`mount*Field`** + **`ensure*Defined`**. |
| **`@abeyjs/uikit/styles/abey-table.css`** | Table stylesheet (**static file**, not emitted from **`dist`** source). |

---

## Web Components & CSS classes

Standard pattern: **`AbeySelectElement.define("abey-select")`** / **`ensureAbeySelectElementDefined`** (each control family exposes a similar **`define`** helper).

Shared **BEM-ish** **`ABEY`** map and tag names **`ABEY_TAG`** live in **`abey-form-classes.ts`** (`<abey-input>`, `<abey-select>`, …).

Tabular UI: **`AbeyTableElement`**, **`createAbeyTable`**, **`avatar`**, **`statusPill`** — full behaviour and config fields are documented in the repo **`docs/abey-table.md`**.

---

## Forms

### Declarative view model

 **`FormViewDef`** + **`StateCell`** + **`OmegaRuntime`**:

- **`mountFormView`** — binds **`cell.subscribe`**, validates with **`FormViewDef.schema`** via **`@abeyjs/validation`**, submits **`onValid`**, supports async **select lookups** (**`resolveSelectOptions`**).
- **`createOmegaFormSurface`** — DOM shell only (section + **`abey-form`** layout); callers own placement and **`update(vs)`** loop.

Themes: **`applyViewTheme`** merges **`ViewTheme`** tokens onto a host (**`mount-form`/theme**).

### Class / decorator JSON → form

 **`class-form.ts`** (**`parseClassJson`**, **`FormModel`** decorators, **`classToAbeyFormConfig`**) turns class metadata into **`AbeyFormConfig`** consumed by **`AbeyFormElement`**.

 **`inferBasicFormSchema`**, **`zodForViewField`** infer Zod where the bundle includes **Zod**.

### Line items & tables

 **`mountLineItemsTable`**, **`lineItemsColumnsFromGenerated`**, **`createLineItemsEmptyRow`**, **`createLineItemsRowSchema`** — repeatable grid rows backed by schemas.

### Reactive draft (**`reactive-draft.ts`**)

 **`FormStore`**, **`lens`**, **`bindTextInput`**, **`attachAsyncValidator`** — fine-grained field binding without OM templates.

 **`wireNativeFormDraft`** bridges plain inputs to the same mechanics.

---

## Select lookups & OpenAPI CRUD

 **`mapJsonToFieldSelectItems`** and **`resolveFieldSelectOptionsFromFetch`** normalize list JSON (`data` / `items` / …) into **`{ value, label }[]`**, aligned with **`DynamicCrudAgent.fetchLookupOptions`** (**`@abeyjs/openapi`**).

---

## Global registry (**`global-registry.ts`**)

 **`setGlobalRegistry`** / **`getGlobalRegistry`** and dotted **`setGlobalRegistryPath`** stash objects on **`globalThis`** so markup attributes like **`configpath="__app.form"`** can resolve hosts without pervasive **`as any`**.

---

## Build

```bash
npm run build -w @abeyjs/uikit
```

---

## Related docs

- Table component: **`docs/abey-table.md`** (in the monorepo root).
