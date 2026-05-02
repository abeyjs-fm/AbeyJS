# `@abeyjs/openapi`

Browser-oriented **glue** between an **OpenAPI document** (`Record<string, unknown>` — typically parsed JSON) and **`OmegaRuntime`**: discovers collection paths that look like REST lists (**GET + POST**), builds **`ListViewDef` / `FormViewDef`** + a **Zod** row schema, registers a **`DynamicCrudAgent`** with CRUD intents, and optionally **`mountOpenApiCrudView`** renders list + form + trace panel.

Heavy lifting for **workflow + codegen lives in `@abeyjs/cli`** (`abeyjs connect`, `abeyjs generate views`, …). This package is what running apps **`import`** at runtime.

---

## Typical stack

```
OpenAPI JSON  →  discoverFirstCrud / discoverAllCrud  →  DiscoveredCrud
                     ↓
        registerOpenApiCrud(runtime, spec, http?)   →  DynamicCrudAgent + intents …/List, …/Create, …
                     ↓
        mountOpenApiCrudView({ root, agent, discovered, intents… })   →  DOM
```

 **`OmegaHttp`** from `@abeyjs/http` is optional; omit it only when you rely on **`useMemoryOnApiFailure`** or purely local mocks.

---

## Public API (see `src/index.ts`)

| Export | Role |
|--------|------|
| **`discoverFirstCrud`**, **`discoverAllCrud`** | Parse spec → **`DiscoveredCrud`** (path, entity name, list/form defs, Zod, row key, optional item/update/delete metadata, pagination hints). |
| **`registerOpenApiCrud`**, **`registerWithDiscovered`**, **`registerOpenApiAllCrud`** | Register **`DynamicCrudAgent`** + **`Entity/List`**, **`Entity/Create`**, optional **`Update`** / **`Delete`** intents. |
| **`DynamicCrudAgent`**, **`DynamicCrudViewState`**, **`OpenApiRow`** | Stateful agent: loads list (server paging when configured), applies create/update/delete intents, drives form validation from Zod. |
| **`mountOpenApiCrudView`** | Mounts list + form + optional HTTP trace strip to a **`root` HTMLElement`. |
| **`jsonObjectSchemaToZod`**, **`guessRowKeyFromSchema`** | Low-level JSON Schema → Zod for CRUD item rows (flat scalars + enums). |
| **`OpenApiCrudListBehaviorOverrides`** | Type for advanced list behaviour hints (from **`crud-view-config-types.ts`**). |

---

## Discovery heuristics (`discover-crud.ts`)

- Looks for **collection** paths where **GET** returns an array (or `data` / `items` / `results` / `value` wrapping an array) and **POST** accepts a JSON body.
- **`$ref` / `components.schemas`** resolved via **`derefNode`** (`refs.ts`).
- Sibling **`{id}`**-style item routes unlock **update** (PUT/PATCH) and **delete** when present in the spec.
- Entity **PascalCase** name is derived from path segments (see **`pathToEntityPascal`**).

When the spec does not match these patterns, discovery returns an **error** string or an **empty** array (`discoverAllCrud`).

---

## Intents & agent

For entity **`Product`** (example):

| Intent | When registered |
|--------|-----------------|
| **`Product/List`** | `agent.loadList()` |
| **`Product/Create`** | `applyCreateIntent(row)` |
| **`Product/Update`** | If update path exists |
| **`Product/Delete`** | If delete operation exists |

**`registerWithDiscovered`** throws if `registerAgent` receives a channel different from **`runtime.channel`** (guards mis-wired runtimes).

---

## `mountOpenApiCrudView`

Expects an **already registered** agent and the **`DiscoveredCrud`** + intent name strings returned from registration. Options include **`showToolbar`**, **`showTrace`**, **`showFlowMessage`** (defaults lean toward **on** except where noted in source).

UI labels in the default mount are **Spanish** in the current implementation (toolbar / row actions); replace by forking the mount or generating views from the CLI for your locale.

---

## CLI companion (`@abeyjs/cli`)

| Command | Relation to this package |
|---------|--------------------------|
| **`abeyjs add openapi`** | Adds **`@abeyjs/openapi`**, **`@abeyjs/http`**, Vite proxies, stubs; does not replace manual **`registerOpenApiCrud`** wiring unless the template already does so. |
| **`abeyjs connect`** | Writes **`.abeyjs/connect.json`** (**`ConnectContract`** in **`cli/src/openapi-contract.ts`**) + **`abeyjs.connect.yml`** — input to **`abeyjs generate views`**, not consumed directly by **`@abeyjs/openapi`** at runtime unless you glue it yourself. |
| **`abeyjs generate views`** | Emits OM/TS views from the contract; overlaps conceptually with **`mountOpenApiCrudView`** (different output path). |
| **`abeyjs codegen`** | **`openapi-typescript`** types + stubs — orthogonal to **`DynamicCrudAgent`**. |

---

## Dependencies

Pulls **`@abeyjs/agents`**, **`@abeyjs/core`**, **`@abeyjs/runtime`**, **`@abeyjs/state`**, **`@abeyjs/http`**, **`@abeyjs/view`**, **`@abeyjs/uikit`**, **`@abeyjs/validation`**, **`zod`**.

---

## Build

```bash
npm run build -w @abeyjs/openapi
```
