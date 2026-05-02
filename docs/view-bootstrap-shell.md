# Bootstrap and shell (`@abeyjs/view`)

`bootstrapOmegaApp` is the entry when building an Omega SPA: wraps **`mountRoutedApp`**, publishes navigation to the channel on route changes, optional public branch before loading authenticated chrome.

Interior order:

1. **`auth`** (optional): URL hits **`publicPaths`** *and* user not authenticated ⇒ run **`mountPublic(root)`**, **skip** dashboard. Authenticated user on public URL ⇒ **`location.replace`** to **`redirectIfAuthed`** (default **`/home`**).
2. **Shell**: otherwise **`mountRoutedApp`** on the same **`root`** with **`config.shell`**.
3. **Runtime**: resolved by **`createOmega`** when supplied; returned object has **`router`**, **`dispose`**, **`runtime`**.

Inspect **`packages/view/src/bootstrap/omega-bootstrap.ts`** for line-by-line detail; here we condense **`MountRoutedAppConfig`**.

### `auth` branch (quick ref)

```ts
auth: {
  publicPaths: ["/login", "/reset"],
  isAuthenticated: () => Boolean(/* your cookie/session */),
  redirectIfAuthed: "/dashboard",
  mountPublic: (root) => {
    /* mount login SPA; return dispose if timers/subscriptions */
  },
},
```

Without `auth`, **`shell`** always loads with routes you pass.

---

## Shell options (`MountRoutedAppConfig`)

| Field | Type | Worth committing |
|-------|------|-------------------------|
| `brand` | `string` | Title/mark primary in app bar/sidebar depending on variant. |
| `subBrand` | `string?` | Optional subtitle (“admin”, environment…). |
| `variant` | `'admin'` \| `'landing'` \| `'blank'` | **`admin`** = sidebar + outlet; **`landing`** = top horizontal bar + public-ish layout; **`blank`** = **`main.abey-outlet` only**, no preset nav (embeds). |
| `routes` | `AppRoute[]` | Flat route table; **`/guides/routing`**. |
| `dashboardLayout` | `boolean?` | Default **`true`** when `variant === 'admin'`; Omega dashboard density vs lighter bar (`false`). |
| `appearance` | `'dark'` \| `'light'`? | Initial admin chrome. **`persistAppearance`** default true: **localStorage wins** under **`ABEY_SHELL_APPEARANCE_STORAGE_KEY`**. |
| `persistAppearance` | `boolean?` | |
| `showAppearanceToggle` | `boolean?` | ☀️/🌙 icons admin; **`prefers-reduced-motion`** respected. Default true. |
| `logoMark` | `string?` | Short stripe initials/logo; ignored with **`brandTitleSplit`** + custom text + logo. |
| `brandLogoSrc` / `brandLogoAlt` | `string?` | Dashboard image logo; theme hides CSS jewel when `<img>` present. |
| `brandTitleSplit` | `{ lead; tail }?` | Split mark (“Abey” + “JS”) with **`--abey-brand-tail-*`** gradient. |
| `appBarActions` | `ShellAppBarAction[]?` | Right app-bar buttons.**`[]`** removes demos; **omit** = FA placeholders (**load FA** in index). Dropdowns via **`dropdownMenu`**. |
| `appBarActionsAppend` | `…?` | Append after defaults or **`appBarActions`**. |
| `rootClassName` | `string?` | `#app` classes, e.g. `abey abey-app my-brand`. |
| `fallbackPath` | `string?` | Initial nav when pathname does not match. |
| `onRouteChange` | `(path,route)=>void?` | Callback beside **`omega/nav:changed`** publish. |
| `appDocumentTitle` | `string?` | `<title>` base; active route updates when **`title`** set. |
| `outletRouteTransition` | `boolean?` | Fade/slide outlet transition; **`false`** instant swap (dense docs). Default true.**`prefers-reduced-motion`** honored. |
| `themeVars` / `themeVarsDark` / `themeVarsLight` | `Record<string,string>?` | Inline tokens on shell host (`abey-accent` sans `--`). **`themeVarsDark`** when **`abey--dark`**. |
| `sidebarMenuMode` | see below | Admin sidebar only. |

### `sidebarMenuMode` (admin)

Valid **`static` \| `slim` \| `reveal` \| `horizontal` \| `overlay` \| `compact` \| `drawer`**. **`horizontal`** replaces aside with nav under app bar. This docs **`main.ts`** uses **`compact`** for prose-heavy layout.

Without **`@abeyjs/view/theme/omega-default.css`**, modes still render structure but lose cohesive hierarchy visuals.

---

### **`omega/nav:changed`** event

Successful navigation publishes to **`runtime.channel`** (when runtime exists):

- **`from`** / **`to`**: normalized pathnames.
- **`title`**: active **`AppRoute`** title or null.
- **`routePath`**: row **`path`**.

Telemetry, breadcrumbs, client history—without tying to raw `History`.

---

### Sidebar from API or mock (`fetchSidebarNav`, `buildRoutesFromApi`)

Servers **never invent screens**. Client ships all **`mount`** code; backend only adjusts **order**, **labels**, **icons**.

1. **`const base = getRoutes()`**: JSON paths must have real TS rows.
2. **`await fetchSidebarNav(opts?)`**: dev infers (**`import.meta.env.DEV`**) tries **`GET /mock-nav.json`** (`public/mock-nav.json` in Vite). Prod typical: **`GET /api/nav`** with **`credentials: 'include'`**. Response **`{ "items": ApiNavItem[] }`** with **`path`**, **`label`**, optional **`navIconFa`**, nested **`children`**.
3. If items valid ⇒ **`routes = buildRoutesFromApi(base, items)`**.
4. Pass array to **`shell.routes`**.

Missing base paths silently drop.**`path: '*'`** lands **last**.

Full snippet in **`examples/*/src/main.ts`** and **admin** template:

```ts
const base = getRoutes();
let routes = base;
const apiItems = await fetchSidebarNav({
  mockUrl: "/mock-nav.json",
  apiUrl: "/api/nav",
  preferMockFetch: false,
  mockDelayMs: 0,
});
if (apiItems?.length) {
  routes = buildRoutesFromApi(base, apiItems);
}
bootstrapOmegaApp(root, {
  createOmega,
  shell: { /* … */ routes },
});
```

### Vite teardown / HMR

Register in **`main.ts`**:

```ts
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dispose();
  });
}
```

Without it reloads stack duplicate shells invisible in `#app`.

Next: **`/guides/routing`**.
