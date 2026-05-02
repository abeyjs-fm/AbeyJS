# AbeyJs security — product rules

Designed in `@abeyjs/view`: **secure by default**, and dynamic HTML must **scream** risk (`abey-html`, explicit sanitization). PRs inserting `innerHTML` from API data without `setSanitizedHtml` or `textContent` are **bugs**, not features.

One-liner policy: **safety is the default; risk is only explicit** (you or code declare it).

Linked to **`/guides/vision`** (HTML/CSS narrative); **here** hard rules + APIs.

---

## Rules (normative)

1. **All values render as text by default**  
   Lists, forms, and declarative pages use `textContent` or text nodes, not raw HTML strings.

2. **`{{ key }}` binding is always safe (escaped)**  
   `@abeyjs/view` `bindText` replaces `{{ key }}` with `escapeHtml` of the value. No raw-HTML template mode in core.

3. **Never assign `innerHTML` automatically**  
   No automatic or data-driven API assigns `innerHTML` from domain data without the explicit layer below.

4. **Automatic mode does not execute dynamic HTML**  
   `PageViewSpec`, `buildPageView`, `createPageViewElement`, and Omega lists/forms do not interpret HTML from data strings.

5. **Dynamic HTML must be explicit: `abey-html` / `data-abey-html`**  
   With `setSanitizedHtml`, the host gets class `abey-html` and `data-abey-html="1"` for audit/traceability.

6. **Dynamic HTML goes through sanitization**  
   - Default: `sanitize()` / `AbeyJs.sanitize()` **escape** to entities—no active tags, no scripts.  
   - Rich content: configure with `configureSanitize` (e.g. DOMPurify) and an allowlist. Do not trust “looks clean” strings.

7. **Hybrid DOM + AbeyJs**  
   For HTML fragments use `setSanitizedHtml` or `textContent` + `escapeHtml`. If you centralize DOMPurify, document why.

8. **Advanced: full control, your responsibility**  
   Assigning `innerHTML` yourself is allowed; framework does not stop you—risk is fully application-level.

9. **Never trust user input**  
   Every API, form, or query must validate; client is never the only defense.

10. **Server validation (required in domain)**  
    AbeyJs can reuse Zod on the client; the **server** enforces contract and validates again.

11. **AbeyJs does not run injected scripts by default**  
    No `eval`, no injected `<script>`, HTML defaults escape or go through `sanitize`.

12. **Summary**  
    Safety = default path (text, escape, no magic `innerHTML`). Explicit risk = `setSanitizedHtml`, `configureSanitize`, or conscious manual DOM.

---

## API reference

| Symbol | Package | Use |
| --- | --- | --- |
| `escapeHtml` | `@abeyjs/view` | Arbitrary value → safe string. |
| `bindText` | `@abeyjs/view` | Templates with `{{ id }}`, values escaped only. |
| `sanitize` / `AbeyJs.sanitize` | `@abeyjs/view` | Base policy; replaceable via `configureSanitize`. |
| `setSanitizedHtml` | `@abeyjs/view` | Recommended entry for HTML in an `HTMLElement` from data. |
| `clearSanitizedHtmlHost` | `@abeyjs/view` | Clear marks and empty node. |
| `registerAbeyJsView` / `<abeyjs-view>` | `@abeyjs/view` | Views: `{{a.b}}` (escape), `abeyjs-for`, `abeyjs-html` → `setSanitizedHtml`. |
| `getByPath` | `@abeyjs/view` | Model path navigation with safe binding. |

Implementation: `packages/view/src/safe-html.ts`. Product + HTML: **`/guides/vision`**.
