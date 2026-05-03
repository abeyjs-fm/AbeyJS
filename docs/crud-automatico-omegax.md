# Automatic CRUD in AbeyJs — honest product status

This table avoids promising on the web what the binary cannot deliver yet. “Automatic CRUD” in product talk means **one source of truth** (today **OpenAPI**) feeding agent, intents, list/form defs, and reactive mounts—not magic that guesses your domain without a spec.

Short positioning vs manual work: **`/guides/vision`**.  
**Important:** the example DSL at the end (`model Cliente` …) **does not** exist as compiled syntax—**direction only**. The real path is OpenAPI + `@abeyjs/openapi` + `@abeyjs/view` views.

**Documented exception:** invoice-style docs (header + lines + payments) in `examples/MyMiusic` follow their own meta (`InvoiceDocumentFormMeta`), not this generic CRUD pipeline—read that ecosystem README before copying.

---

| # | Feature | Status | Notes (repo) |
| --- | --- | --- | --- |
| 1 | Declarative “model-first” model separate from HTTP | **Partial** | Today’s source: **OpenAPI / JSON Schema** → `ListViewDef` + `FormViewDef` + Zod via `packages/openapi/src/discover-crud.ts`. No proprietary entity language outside the spec. |
| 2 | REST wiring without hand-`fetch` per endpoint | **Partial** | `DynamicCrudAgent` + `createOmegaHttp`; you bring spec, baseUrl, proxy/CORS. |
| 3 | Table+form UI “without every pixel” | **Partial** | `mountListViewSync` / `mountFormView` read agent state; `examples/crud-app` still shows imperative assembly. Single public full-screen CRUD mount TBD if we close it as API. |
| 4 | Granular list reactivity | **Yes** | `rowKey`, `mergeListRowsByKey`, RAF batching — `packages/view/src/dom/mount-list-sync.ts`. |
| 5 | Generic automatic named store | **Partial** | `StateCell` + OpenAPI agent view state—pattern exists, no branded “Redux”. |
| 6 | Unified client validation | **Partial** | Zod inferred/generated; server still validates (required in domain). |
| 7 | Actions via intents (not stray handlers only) | **Partial** | `…/List`, `Create`, `Update`, `Delete` intents from spec; buttons still wired with helpers like `mountIntentButton` where needed. |
| 8 | Rich field types (date, badge, etc.) | **Partial** | Basemap `text` / `number` / `email` / `readonly`; extend manually in `ViewField`. |
| 9 | Strong convention without spec | **No** | Convention **requires** faithful OpenAPI with collection + optional `/{id}`. |
| 10 | Progressive auto → manual customization | **Yes (direction)** | Documented **`/guides/vision`** + **`/guides/security`**. |
| 11 | XSS-safe defaults | **Yes** | **`/guides/security`**. |
| 12 | AbeyJS default theme styles | **Yes** | `@abeyjs/view/theme/omega-default.css`, `--abey-*`. |
| 13 | Sync after mutation without full reload | **Partial** | Agent state updates lists/forms; “always server-identical” may need refresh. |
| 14 | Optimization (app-level cache) | **Partial** | List batching yes; declarative app cache not core focus. |
| 15 | Entity/intent feel | **Partial** | Names from paths (`entityPascal`); you still see `mount*` in routes. |

---

## Wire app to local backend (workshop recipe)

With CLI built in the monorepo:

```bash
node packages/cli/dist/cli.js add openapi <project-folder> \
  [--proxy <https://127.0.0.1:7019>] \
  [--openapi-path /swagger/v1/swagger.json]
```

Defaults target typical .NET + Kestrel; adjust proxy and path. Then: `npm i`, `.env` from `.env.example`, start API, try your demo route (e.g. **`/crud-api`** depending on scaffolding).

## Summary

- **Solid:** discovery + agent + keyed reactive list + HTML safety policy + theme.
- **Aspirational:** less `examples/crud-app`-style boilerplate, richer field maps, possible DSL or single-screen generator.

### Dream syntax (not implemented)

```text
model Cliente
connect Cliente "/api/clientes"
view Clientes auto
```

Practical analogue today: **OpenAPI** + `registerOpenApiCrud` or `registerOpenApiAllCrud` + routes that mount views.

Revalidate this table vs `packages/openapi` and `packages/view` on each release.

Next web guide: **`/guides/security`**.
