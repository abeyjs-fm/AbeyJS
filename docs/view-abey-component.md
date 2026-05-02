# `@AbeyComponent` and OM views

**`@AbeyComponent`** decorates subclasses of **`AbeyComponentElement`** (**`@abeyjs/view`**). Generated or handwritten: compiler wires **`template`** / **`compiledTemplate`**; decorator connects **open Shadow DOM**, styles, reactive binder, CE lifecycle (**`connectedCallback`** / teardown).

Typical screen component: **`template`** import from **`.view.html`**, optional **`stylesText`** (**`*.css?inline`**), **`state`** initialized before **`super.connectedCallback()`** so first paint has values.

---

## Canonical minimal example

```ts
import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN } from "@abeyjs/view";
import { template } from "./app.dashboard.view.html";
import styles from "./app.dashboard.view.css?inline";

@AbeyComponent({
  selector: "app-dashboard",
  template,
  stylesText: [styles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
})
export class AppDashboard extends AbeyComponentElement {
  connectedCallback(): void {
    const channel = typeof window !== "undefined" ? window.__abeyDi?.channel?.() : undefined;
    this.state = {
      title: "Dashboard",
      openPreferences() {
        channel?.publish?.(/* … */);
      },
    };
    super.connectedCallback();
  }
}
```

### Why `DOM_CHANNEL_*`

Binder code consults **`DOM_CHANNEL_TOKEN`** to publish intents without importing global **`OmegaRuntime`**. Omit provider ⇒ advanced bindings fail. **Admin** templates include default—keep until you inject **`runtime.channel`** via custom factory.

---

## `state` vs class fields

Prefer **`state` flat bag** flagged in template:

- **`{{ prop }}`** has stable reference.
- Binder batches microtask updates.**Deep nesting** OK via path watchers.

Common mistakes:

| Mistake | Symptom |
|-------|---------|
| Skip **`super.connectedCallback()`** after state | Blank / bindings skip. |
| Mutate unrelated clone reference | Incomplete updates. |
| Template imports without **`abeyVitePlugin`** order | Broken chunk.**Plugin order matters.** |

---

## **`componentRoute`**

**`selector` must match exactly**:

```ts
componentRoute("/panel", {
  label: "Dashboard",
  title: "Dashboard",
}, {
  selector: "app-dashboard",
  load: () => import("./views/dashboard/app.dashboard.view.js"),
}),
```

No **`load`** ⇒ static import when bundled elsewhere.

Lazy import: **` .js`** suffix in specifier despite TS source—Vite resolves ESM output.

---

## File naming convention

Recommended: **`app.<area>.<feature>.view.ts`**, paired **`.view.html`** / **`.view.css`**. Matches **`abeyjs generate ecosystem`** for readable PRs.

Many features ⇒ `./views/users/`, `./views/config/` folders.

---

## Frontmatter **`@Component`**

YAML frontmatter **`---`** in **`.view.html`** can hoist meta (`selector`, styles) (**`packages/compiler/README.md`**): compiler can emit **`AbeyComponentElement`**. We still document explicit TS for breakpoint clarity.

Next: **`/guides/data-views`** (list / form).
