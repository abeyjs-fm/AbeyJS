# OM templates (`.view.html` / `.abey`)

Summary of **what the compiler understands today** and how to wire Vite. Detailed passes and edge cases: **`packages/compiler/README.md`**—if this guide disagrees, **the README wins** until we align.

## What problem it solves

**`.view.html`** and **`.abey`** are not static HTML from a server: Vite compiles them to **TypeScript modules** exporting `template`, `compiledTemplate`, `mount`, and sometimes an `AbeyComponentElement` class from frontmatter `@Component`. The bundler gets tree-shaking, code splitting, and normal `.ts` typecheck.

## Vite plugin

```ts
import { defineConfig } from "vite";
import { abeyVitePlugin } from "@abeyjs/compiler";

export default defineConfig({
  plugins: [abeyVitePlugin()],
});
```

- Runs **`enforce: "pre"`** so markup transforms first.
- Template hot reload usually **full dev-server reload** today; fine-grained HMR is still work in progress.

## `abey.json` (optional, next to Vite root)

```json
{
  "styles": ["./src/styles/global.css", "@abeyjs/uikit/styles/abey-table.css"]
}
```

The plugin emits **`/abey-styles.js`**—import it **once** in `main.ts`. If you skip it, **production** has no `index.html` magic: blank apps or 404 scripts.

## Syntax surface (current)

**Structural:** `@if` / `@else`, `@for (x of xs)`, `@switch` (lowers to `@if` ladder).

**Sugar:** `*if`, `*for` on nodes.

**Text:** `{{ expr }}` and `{expr}` in text nodes.

**Attrs:** `[prop]`, `(event)="handler($event)"`, `[(model)]`, `attr="{{ expr }}"`, mixes like `href="/u/{{ id }}"`, `<select [items]>`.

**Optional YAML frontmatter** `---` … `---` with `@Component({ selector, styles, state?, aot? })`. Default `aot` **true** with qualifying HTML tries AOT `createElement`; otherwise falls back to `compiledTemplate` parse.

**Hard limit:** expressions are **opaque strings** to the compiler—**no** template typecheck yet.

## Compiled module exports

| Symbol | Use |
|--------|-----|
| `template` | Original markup; feed `@AbeyComponent({ template })` for “live” binder. |
| `compiledTemplate` | HTML with `data-abey-*` for classic `mount()`. |
| `mount(outlet, ctx)` | Returns `{ render, dispose }` for imperative binding. |
| Custom element class | If frontmatter defines `@Component`. |

## TypeScript project typings

In `src/vite-env.d.ts` (or similar):

```ts
declare module "*.view.html" {
  export const template: string;
  export const compiledTemplate: string;
  export function mount(outlet: HTMLElement, ctx: Record<string, unknown>): {
    render: () => void;
    dispose: () => void;
  };
}
```

Tighten `ctx` if your app uses a stricter contract.

## `.abey` “old Astro-style” files

Legacy drafts mentioned embedded TS `{ctx}` blocks; **current pipeline** is `compileAbeyToTs` aligned with OM above. External docs that contradict this are obsolete—prefer **`.view.html`**.

## Starters

- **`empty` / `abeyjs`** template: `src/views/home/app.home.view.*`.
- **`admin`**: denser product conventions.

Template differences: `packages/cli/templates/README.md`.

Next: **`/guides/abey-component`** to add TS from the compiler, or **`/guides/monorepo`** if you develop the compiler itself.
