# AbeyJs template files (`.view.html` / `.abey`)

The Vite plugin **`abeyVitePlugin`** from **`@abeyjs/compiler`** compiles **`*.view.html`** and **`*.abey`** into TypeScript modules (**`template`**, **`compiledTemplate`**, **`mount`**, optional **`@Component`** custom element). Behaviour, pass order, cache, and tooling are documented in **`packages/compiler/README.md`** — that file is the source of truth for syntax.

This page is a **short orientation** plus pointers to starters that already use OM templates.

---

## Supported surface (today)

Structural and binding features match the compiler implementation, including:

- Optional YAML **`---`** frontmatter with **`@Component({ selector, styles, … })`**.
- Structural blocks: **`@if` / `@else`**, **`@for`**, sugary **`*if` / `*for`**, **`@switch`** lowering.
- Text: **`{{ expr }}`** and **`{ expr }`** in text nodes.
- Attributes: **`[prop]`**, **`(click)`**, **`[(model)]`**, **`attr="{{ }}"`**, mixed **`href="/u/{{ id }}"`**, **`<select [items]>`**, etc.

Expressions are opaque strings emitted into generated **`mount()`** — **no compile-time typing** on template expressions yet.

---

## Vite wiring

```ts
import { defineConfig } from "vite";
import { abeyVitePlugin } from "@abeyjs/compiler";

export default defineConfig({
  plugins: [abeyVitePlugin()],
});
```

Optional **`abey.json`** beside Vite **`root`** for global styles (**`packages/compiler/README.md`**).

---

## Starters shipped with the CLI

The **`AbeyJs`** template includes a compiled home view:

- **`src/views/home/app.home.view.html`** + **`app.home.view.ts`** (`@AbeyComponent` wrapper).

See **`packages/cli/templates/README.md`** for how **`admin`** / **`AbeyJs`** differ.

---

## TypeScript imports

Declare virtual modules when needed (snippet in **`packages/compiler/README.md`** under “TypeScript: typing template imports”).

---

## Older “Astro-like `{ctx}` `.abey`” notes

Older drafts described TypeScript **`{}`** blocks in markup with **`export type Ctx`**. That **does not match** the current **`compileAbeyToTs`** pipeline (**`packages/compiler/src/abey-compile.ts`**, **`{{ }}` / OM directives** above). Prefer **`.view.html` / `.abey`** authored with the OM surface documented in the compiler README.
