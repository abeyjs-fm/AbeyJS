# Data-driven lists and forms

This chapter documents **`@abeyjs/view`** mounting UI **without** hand-iterating table rows when you already have a **`ListViewDef`**, **`FormViewDef`**, or reactive signals. Actual DOM inputs also live in **`@abeyjs/uikit`** when using **`abey-*`** primitives.

These mounts **consume coherent defs** (`ViewField` + metadata), typically produced by:

- OpenAPI codegen (**`discover-crud`** + agent),
- CLI program generators,
- decorated model classes (**`classToAbeyFormConfig`**; see **`/guides/entities-forms`**).

### First: **`registerAbeyJsUi()`**

Run it **once** in **`main.ts`** before routes that load **`abey-form`**. Missing **`customElements.define`** ⇒ incomplete screen.

---

## Public mount APIs (quick reference)

| API | Typical production role | Ops notes |
|-----|------------------------|-------------------|
| **`mountListView`** | First paint async when metadata arrives after fetch | Use when defs may land after initial microtasks. |
| **`mountListViewSync`** | **High-frequency reactive table** (streaming updates, OpenAPI list intents) | RAF batching + merge by **`rowKey`**; inspect **`mergeListRowsByKey`** if perf misses. |
| **`mountFormView`** · **`createOmegaFormSurface`** | Heavy model editing screens | **`createOmegaFormSurface`** avoids tearing the whole shadow root when layout needs it. |
| **`mountSignalList`** | Fast experiments with project **signals** | When defs are not stable yet. Fewer guarantees than official OpenAPI cell path. |
| **`bindActions`**, **`bindAbeyTemplate`** | Declarative partials + click delegation | When mixing static HTML with dynamic slots. |
| **`blocks-screen`** (internal TS helpers) | Multi-pane dashboards | Large internal UI; API still stabilizing—check exported typings if you rely on it. |

### Peer **`zod`**

Declared **peerDependency** so field validation lines up with **`@abeyjs/validation`**. Install explicitly when bundlers prune dev deps.

---

## **`DynamicCrudAgent`** integration pattern

Typical shape: agent registers **`Entity/List`** intents, state exposes **`listView` / `formView`** defs. Your route runs **`mountListViewSync(outlet, { … })`** with the overrides your version expects (**good TS autocomplete** pays off when the API evolves). Broken typings vs runtime ⇒ treat as bug.

---

## Manual fallback

When defs are not enough (**complex custom column renderers**):

1. `mountListView*` for the base grid.
2. Subscribe to **`channel`** / agent cell and patch DOM selectively.

This stack supports hybrid usage because row updates are idempotent with keys.

Next: **`/guides/runtime`**.
