# `@abeyjs/compiler`

Turns AbeyJs markup files into **plain TypeScript modules** the bundler can import. Pair it with Vite via `abeyVitePlugin()` so `*.view.html` and `*.abey` behave like first-class sources instead of static HTML entrypoints.

---

## Compilation pipeline (`compileAbeyToTs`)

The public function walks the source in a **fixed order** (see `compileAbeyToTs` in `src/abey-compile.ts`). Skipping or reordering passes would break markers such as `data-abey-select-items` vs generic `[prop]` handling.

| Step | What runs | Why it matters |
|------|-----------|----------------|
| 1 | `splitFrontmatter` | Optional `---` … `---` block; body becomes the template string. |
| 2 | `parseComponentMeta` | Reads `@Component({ selector, styles, state?, aot? })`. Missing `aot` defaults to **`true`**; set `aot: false` to force the `innerHTML` mount path. |
| 3 | `preprocessSugar` | `*if` / `*for` / `@switch` lowering before structural extraction. |
| 4 | `extractAttrMixedInterpolation` | Mixed `href="/u/{{ id }}"` style attributes. |
| 5 | `extractAttrHoles` | Exact `attr="{{ expr }}"`. |
| 6 | `extractSelectItemsDirectives` | **Before** bracket extraction: `<select [items]>` expansion. |
| 7 | `extractBracketBindings` | `[prop]`, `(event)`, `[(model)]`, class/style maps, etc. |
| 8 | `extractIfBlocks` / `extractForBlocks` | `@if` / `@else if` / `@else`, `@for`; nested `@for` under `@if` is merged for render ordering. |
| 9 | `extractHoles` | Text `{{ }}` and `{expr}` only. |
| 10 | Emit | `template`, `compiledTemplate`, `mount`, helpers; optional AOT factory when eligible; optional `AbeyComponent` class. |

**Render ordering:** `@if` / `@for` blocks are sorted **outer → inner** (higher block index first) so a parent branch does not wipe nested DOM when toggling.

**AOT:** When `aot` is true and the compiled HTML contains **no** `template data-abey-if` / `template data-abey-for`, `buildAotFactory` emits imperative `createElement` code. Otherwise `mount` falls back to parsing `compiledTemplate` even if `aot` was left at default.

---

## Vite hook (`abeyVitePlugin`)

- Runs **`enforce: "pre"`** so templates compile before the rest of the pipeline.
- Resolves `.view.html` / `.abey` imports to **virtual modules** so Vite’s dependency scan does not treat them as multi-page HTML entries.
- Feeds the generated TS through **esbuild** with `experimentalDecorators` enabled—frontmatter-generated classes may emit `@AbeyComponent`.
- Reads optional **`abey.json`** beside the Vite root (see below).
- Hot updates currently **full-reload** the dev server (granular HMR is future work).

### Virtual module IDs

Resolved ids look like:

`virtual:abeyjs-abey:` + **base64url** of the absolute file path (UTF-8, `+` → `-`, `/` → `_`, padding `=` stripped).

The plugin maps these back to disk in `load` and compiles with `compileAbeyToTs`.

### `abey.json` (optional)

Place next to Vite **`root`** (often the app folder that contains `vite.config.*`).

Minimal shape:

```json
{
  "styles": ["./src/styles/global.css", "./src/styles/theme.css"]
}
```

- Each string is a path **relative to `abey.json`** (or resolvable from the project); the plugin generates a small module that **imports** them so Vite processes URLs and HMR.
- If the file exists, `transformIndexHtml` injects `<script type="module" src="/abey-styles.js"></script>` into `<head>`.

---

## What a compiled module exports

| Symbol | Purpose |
|--------|---------|
| `template` | Original markup (escaped string). Feed `@AbeyComponent({ template })` when the runtime binder should keep raw bindings alive. |
| `compiledTemplate` | Transformed HTML with `data-abey-*` markers, `<template data-abey-if/for>`, etc.—what the non-AOT `mount()` path expects. |
| `mount(outlet, ctx)` | Binds the compiled template to a DOM node, returns `{ render, dispose }`. |
| Optional custom element class | When frontmatter includes a `@Component({ selector, styles, state? })` block, the compiler emits an `AbeyComponentElement` subclass wired to `mount`. |

Frontmatter is optional YAML-style `---` … `---`; everything after the second delimiter is template body.

---

## Syntax surface (current compiler)

**Structural**

- `@if (expr) { ... }` with `@else if` / `@else`.
- `@for (item of listExpr) { ... }` (optional `track` clause ignored in MVP).
- `@switch` rewritten to an `@if` ladder during preprocess.

**Sugar**

- `*if="expr"` / `*for="item of expr"` on elements unwrap into the block forms above.

**Text**

- `{{ expr }}` mustache holes in text nodes.
- `{expr}` single-brace holes (same insertion mechanism, lighter syntax).

**Attributes**

- Exact attribute binding `attr="{{ expr }}"`.
- Mixed attribute strings like `href="/u/{{ id }}"`.
- Bracket bindings: `[prop]`, `[attr.name]`, `[class.foo]`, `[style.prop]` / `[style.prop.px]`, `(event)="handler($event)"`, `[(model)]` with element-aware two-way sugar.
- `<select [items] [value] [name]>` helper expands into option rendering logic.

**Limits (today)**

- Expressions are **not** type-checked at compile time.
- Parser passes are MVP: avoid exotic nesting the tests do not cover yet.

---

## TypeScript: typing template imports

Vite resolves templates to JS modules. Add a **declaration** in your app (path is up to you; many projects use `src/vite-env.d.ts`):

```ts
/** Matches the `ctx` object your screen passes into `mount` (narrow per view in your app if you want). */
type AbeyViewCtx = Record<string, unknown>;

declare module "*.view.html" {
  export const template: string;
  export const compiledTemplate: string;
  export function mount(
    outlet: HTMLElement,
    ctx: AbeyViewCtx
  ): { render: () => void; dispose: () => void };
}

declare module "*.abey" {
  export const template: string;
  export const compiledTemplate: string;
  export function mount(
    outlet: HTMLElement,
    ctx: AbeyViewCtx
  ): { render: () => void; dispose: () => void };
}
```

Emitted modules type `mount` as `ctx: Ctx` but **`Ctx` is not exported** by `@abeyjs/view`; use `AbeyViewCtx` (or replace with your own domain type). Custom elements from `@Component` add named class exports—extend the `declare module` when you import those symbols.

---

## Programmatic API

```ts
import { compileAbeyToTs } from "@abeyjs/compiler";

const { code } = compileAbeyToTs(source, "/abs/path/to/screen.view.html");
```

`code` is ready to hand to esbuild/TypeScript the same way the Vite plugin does.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Vite / esbuild errors mentioning `html:virtual:` or dependency scan on `.view.html` | Ensure `abeyVitePlugin()` is registered and runs **`pre`** (do not strip `enforce`). The plugin disables automatic optimize-deps discovery for this reason. |
| `[value]` on `<select>` behaves like a generic property | `<select [items]>` **must** be processed before `[prop]`; that order is enforced in the compiler—if you fork passes, preserve it. |
| `@else if` branch never shows | Nested DOM + TreeWalker ordering is sensitive; upstream tests cover supported patterns—avoid replacing nodes while iterating in custom runtime code. |
| Expected AOT (`createElement`) but got `innerHTML` path | AOT is skipped when `@if` / `@for` remain in compiled HTML (`buildAotFactory` returns `null`). |
| Styles from `abey.json` missing | Confirm `abey.json` sits at Vite **root**, paths are correct, and the dev `index.html` is transformed (plugin hook runs). |

---

## Dependencies

`parse5` for HTML-ish transforms, `magic-string` / `esbuild` helpers inside the implementation. Consumers typically add `@abeyjs/view` because generated components import `AbeyComponentElement`.

---

## Build

```bash
npm run build -w @abeyjs/compiler
```
