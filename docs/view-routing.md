# Routing: `AppRoute` and navigation

The **`@abeyjs/view`** router is not a nested magic routes file: we use **`AppRoute[]` flat** plus **`matchAppRoute(path, routes)`**, hitting **`path`** normalized exactly or **`path: '*'`** after scanning more specific routes.

That model stays trivially debuggable, serializable, and mergeable with remote menus. If you wanted React Router nesting, different bet—here you control order with the array literal.

---

## Row contract (`AppRoute`)

Authoritative fields live in **`packages/view/src/shell/app-routes.ts`**:

| Member | Role |
|---------|-----|
| `path` | Route (**no** hashes). Use **`"/"`** for home. **`"*"`** = catch-all (usually last row → 404). |
| `label` | Sidebar short label. **`""`** + **`showInNav: false`** for URL-only screens. |
| `title` | Browser title + shell metadata. |
| `showInNav?` | Default true. **false** skips first sidebar column despite **`label`** (child-only pages inside **`navChildren`**). |
| `navChildren?` | Sidebar tree/groups (**`<details>`** in admin). Leaves are paths but **mountable implementations** must be **another row** in the same array. |
| `mount(outlet)` | Imperative: replace outlet (**`HTMLElement`**) when route wins.**May return `dispose`** (runs before next mount). Without dispose we still clean the outlet—avoid leaks if timers/subs heavy. |
| `navIcon?` · `navIconFa?` | Tiny text icon legacy vs Font Awesome class (**bring FA CSS** when using FA). |

**Rules not spelled out only in typings:**

- Duplicate `path` rows ⇒ last wins if merge duplicates accidentally—treat paths as unique keys.
- Paths without leading `/` normalize with **`/`**.
- **`firstNavPath(routes)`** gives default “first click” when building deep links from backend.

---

## Exported helpers

| Helper | Purpose |
|--------|------------------------|
| **`componentRoute(path, nav, spec)`** | Builds **`AppRoute`** whose **`mount`** creates/teardown **`custom element`** (**`selector`**) after optional **`load()`** (`import`). Free route-level code split. **`selector`** must match OM class (**`@AbeyComponent({ selector })`**). |
| **`pageRoute(path, nav, spec)`** | Declarative text page via **`buildPageView`**: no raw user HTML.**`PageViewSpec`**: safe headings/leads.**Good for docs/CMS you control**. |

For declarative list/form mounts, **`mount`** calls **`mountListViewSync`**, **`mountFormView`**, etc. (see **`/guides/data-views`**).

| Pattern | When |
|--------|--------|
| **`mount` imperative** | Full DOM control.**Special CRUD**, canvas, third-party libs. |
| **`componentRoute`** | Standard product screen (**most admin time**). |

---

## **`navChildren`** example

Concept:

```ts
pageRoute(
  "/sales",
  {
    label: "Sales",
    title: "Sales",
    navChildren: [
      { path: "/sales/orders", label: "Orders" },
      { path: "/sales/clients", label: "Clients", navIconFa: "fa-solid fa-users" },
    ],
  },
  { heading: "Sales", lead: "Pick a submenu." },
),

componentRoute("/sales/orders", { label: "", title: "Orders", showInNav: false }, {
  selector: "app-sales-orders",
  load: () => import("./views/sales/app.sales-orders.view.js"),
}),
componentRoute("/sales/clients", { label: "", title: "Clients", showInNav: false }, {
  selector: "app-sales-clients",
  load: () => import("./views/sales/app.sales-clients.view.js"),
}),
```

`/sales/orders` **must** exist as its own **`AppRoute`** row if users can type that URL—**navChildren** alone does not create mounts.**The `/sales` group** can be index page only or redirect—your call via `pageRoute` index or `fallbackPath`.

---

## Remote menu

See **`fetchSidebarNav` + buildRoutesFromApi`** in **`/guides/bootstrap-shell`**. The server **reorders and relabels known client routes** only—never invents screens without code.

---

## Related utils (**`normalizePathname`**, **`createPathRouter`**)

Runtime intents that navigate programmatically (**`router.navigate(path)`**) use the same string normalization before dispatch. External deep links should treat **`normalizePathname`** as the contract **`matchAppRoute`** uses.

For manual tests inspect **`PathRouter`** in **`packages/view/src/router/path-router.ts`**.

Next: **`/guides/abey-component`**.
