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
        channel?.publish?.(/* ... */);
      },
    };
    super.connectedCallback();
  }
}
```

### Why `DOM_CHANNEL_*`

Binder code consults **`DOM_CHANNEL_TOKEN`** to publish intents without importing global **`OmegaRuntime`**. Omit provider ⇒ advanced bindings fail. **Admin** templates include default—keep until you inject **`runtime.channel`** via custom factory.

---

## Styles: **`stylesText`** vs **`stylesHrefs`** (Vite)

| Field | Typical Vite import | What it is | How it mounts |
| ----- | ------------------- | ---------- | ------------- |
| **`stylesText`** | `import sheet from "./view.css?inline"` | **Raw CSS text** (`string`) | Open shadow root + `<style>`; ships in the **same JS chunk**, no stylesheet URL |
| **`stylesHrefs`** | `import href from "./view.css?url"` or `new URL("./view.css", import.meta.url).href` | **`href`** for a **real CSS URL** | **`mountModuleStyles`** attaches **`<link rel="stylesheet">`** (extra network fetch in dev) |

**Trap — do not mix:** If you **`import blob from "...css?inline"`** and assign it to **`stylesHrefs`**, the runtime sets **`<link href="…">` to the stylesheet source text**, not a path. The browser then issues nonsense requests whose path looks like URL-encoded CSS (e.g. **`.abey-artist %7B …`**).

In development, **`decodeURI`** on that URL can fail (**“URI malformed”**); **`abeyViteMalformedUriGuard`** (see **`@abeyjs/view/dev/vite-malformed-uri-guard`**) answers **400**—that symptom usually means **`?inline`** was wired into **`stylesHrefs`**.

**Fix:** **`stylesText: [sheet]`** when using **`?inline`**; **`stylesHrefs: [href]`** only with **`?url`** (or another real URL).

### What users actually see before fixing it

Knowing the logs helps—you can grep the codebase for **`stylesHrefs`** + **`inline`** immediately.

#### Terminal (CLI templates ship **`abeyViteMalformedUriGuard`**)

Repeated one-line warns (same URL may be suppressed for ~12s):

```
[abey/vite] Malformed request URL — answered 400 (no Internal Server Error).
  /.abey-artist %20%7B %20 ...
  (Repeats throttled … per distinct URL)
```

(or the Spanish‑locale variant: **`[abey/vite] URL mal formada — respondiendo 400`**)

This is **not random noise**: the path snippet often **starts like a CSS class** (`.something`) and **`%7B`** is **`{`**—decoded bits look like stylesheet content.

If you **removed** the guard plugin, Vite spills a long stack repeatedly:

```
Malformed URI sequence in request URL
[vite] Internal server error: URI malformed
    at decodeURI (<anonymous>)
    at viteServeStaticMiddleware (…deps…js:35435)
```

Either way in dev something is **`GET`**‑ing an impossible path.

#### Browser

- With the guard at **`locale: "en"`**, the tab that requested the junk URL gets a **standalone 400 HTML** page (**“Malformed URL”** / Invalid URI escape) with an escaped preview of the path.
- **DevTools → Network**: look for **`stylesheet`** (or **`document`**) failing with **`400`**—the **`Request URL`** pathname will look **like pasted CSS**.

#### What you should do (short checklist)

1. Open the **`@AbeyComponent`** class for that screen or widget—the decorator carries **selector**, **template**, and **styles**.
2. If you did **`import x from "*.css?inline"`**, use **`stylesText: [x]`**, **not** **`stylesHrefs`**.
3. If you meant a **globally linked stylesheet** via **`<link>`**, switch to **`import href from "*.css?url"`** (**or** `new URL(...)`) and keep **`stylesHrefs: [href]`**.
4. Rebuild / refresh—the bogus requests stop.

Guide reference: **`/guides/abey-component`** · also **`mountModuleStyles`** in **`packages/view/README.md`** (URLs only).

#### Resumen para quien llega desde el navegador o la consola (**ES**)

| Qué aparece | Qué significa (AbeyJs) | Acción rápida |
| ------------- | ------------------------ | ------------- |
| **400 · URL mal formada** en dev | El servidor rechazó un path con `%…` ilegal; muchas veces es **CSS puesto donde iba una URL**. | **`?inline`** → campo **`stylesText`**; **`?url`** / URL real → **`stylesHrefs`**. |
| **`[abey/vite] URL mal formada`** y un path tipo **`.algo %7B …`** | Mismo problema: contenido CSS en **`href`** de un **`<link>`**. | Igual que arriba: no mezcles **`stylesHrefs`** con texto de **`?inline`**. |

---

## `state` vs class fields

Prefer **`state` flat bag** flagged in template:

- **`{{ prop }}`** has stable reference.
- Binder batches microtask updates.**Deep nesting** OK via path watchers.

Common mistakes:

| Mistake | Symptom |
|-------|---------|
| **`?inline`** CSS passed to **`stylesHrefs`** instead of **`stylesText`** | Dev **`URI malformed`** / bogus GET paths that look like encoded CSS (**`abeyViteMalformedUriGuard` 400**). |
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
