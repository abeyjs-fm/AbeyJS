import { createPathRouter, normalizePathname } from "../router/path-router.js";
import { firstNavPath, matchAppRoute, type AppRoute, type AppRouteNavChild } from "./app-routes.js";

export type { AppRoute, AppRouteNavChild } from "./app-routes.js";

export type ShellVariant = "admin" | "landing" | "blank";

/** Admin shell chrome only; persists when **`persistAppearance`** is true (default). */
export type ShellAppearanceMode = "dark" | "light";

/** Overrides de tokens CSS Omega en el elemento host del shell (`#app`); claves con o sin **`--`**. */
export type ShellThemeVars = Record<string, string>;

/**
 * Diseño del menú lateral (**solo admin con sidebar**).
 * **`horizontal`** sustituye el aside por una franja horizontal bajo la app bar.
 */
export type ShellSidebarMenuMode = "static" | "slim" | "reveal" | "horizontal" | "overlay" | "compact" | "drawer";

export const ABEY_SHELL_APPEARANCE_STORAGE_KEY = "abey-shell-appearance";

/** Entrada del menú flotante de una **`ShellAppBarAction`** (**`dropdownMenu`**). */
export type ShellAppBarDropdownItem = {
  label: string;
  ariaLabel?: string;
  iconFa?: string;
  icon?: string;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
};

/** Botón en la barra superior (admin dashboard): accesible con `ariaLabel`; icono emoji/texto, FA o solo `label`. */
export type ShellAppBarAction = {
  ariaLabel: string;
  /** Emoji o texto corto si no usas `iconFa`. */
  icon?: string;
  /** Clases Font Awesome 6 en un `<i>` (p. ej. `fa-solid fa-bell`); sustituye a `icon` si no está vacío. */
  iconFa?: string;
  /** Texto visible junto al icono (el botón se ensancha). */
  label?: string;
  /** Avatar en el botón (p. ej. cuenta); tiene prioridad sobre **`icon`** / **`iconFa`**. */
  avatarSrc?: string;
  avatarAlt?: string;
  /**
   * Si hay al menos una entrada con **`label`** no vacío, el botón abre un panel (role=menu).
   * No se ejecuta **`onClick`** del disparador si el menú está activo (**`dropdownMenu`** con entradas).
   */
  dropdownMenu?: ShellAppBarDropdownItem[];
  onClick?: () => void;
};

export type MountRoutedAppConfig = {
  brand: string;
  subBrand?: string;
  variant: ShellVariant;
  routes: AppRoute[];
  /**
   * Dashboard-style chrome: colored logo stripe, rich app bar, icon+text sidebar.
   * Default **`true`** when **`variant === "admin"`**; **`false`** for the slimmer legacy bar only.
   */
  dashboardLayout?: boolean;
  /**
   * **`variant === "admin"`** palette: **`dark`** (default sidebar + app bar) or **`light`**.
   * When **`persistAppearance`** is **`true`** (default), **`localStorage`** (**`ABEY_SHELL_APPEARANCE_STORAGE_KEY`**) wins if set.
   */
  appearance?: ShellAppearanceMode;
  /** Save **`appearance`** / user toggle to **`localStorage`**. Default **`true`** for admin. Ignored outside admin. */
  persistAppearance?: boolean;
  /** Show ☀️/🌙 in the admin app bar — dashboard o barra compacta (**`--shell appbar`**). Default **`true`**. */
  showAppearanceToggle?: boolean;
  /**
   * Mark in the colored stripe (**initials**, etc.). Default **`brand`**.
   */
  logoMark?: string;
  /**
   * Opcional: URL del logo en la marca del **app bar dashboard** (**`svg`**, **`png`**, ruta **`/`**, **`https`**).
   * Oculta el “jewel” **`::before`** del modo horizontal cuando aplica (**`:has(img)`** en tema Omega).
   */
  brandLogoSrc?: string;
  /** Texto **`alt`** del logo; por defecto **`brand`**. */
  brandLogoAlt?: string;
  /**
   * Marca visual en dos partes (**p.ej.** logo „Abey“ + „JS“ con gradiente vía tema **`CSS`**).
   * Si **`logoMark`** tiene texto, se ignora (sólo hay un titular corto personalizado).
   */
  brandTitleSplit?: {
    /** Tramo inicial (**p.ej.** „Abey“ en blanco / **`--abey-brand-mark-lead`**). */
    lead: string;
    /** Tramo final (**gradiente** **`--abey-brand-tail-*`**). */
    tail: string;
  };
  /**
   * Acciones a la derecha del app bar (solo **dashboard** admin). Omitir = placeholders demo (**`iconFa`**);
   * **`[]`** = ninguna (**solo toggle de tema** si **`showAppearanceToggle`**). Lista propia sustituye la demo por completo.
   * Ítem con **`dropdownMenu`** abre opciones extra al pulsar (p. ej. cuenta → ajustes / cerrar sesión).
   */
  appBarActions?: ShellAppBarAction[];
  /** Se añade después de las por defecto, o después de `appBarActions` si lo definiste (útil para ampliar sin copiar defaults). */
  appBarActionsAppend?: ShellAppBarAction[];
  /**
   * Optional node (**admin dashboard** only) inserted after the spacer or horizontal nav,
   * before **`abey-appbar__tools`**. E.g. global search (gets class **`abey-appbar__inset`**).
   */
  appBarInset?: HTMLElement;
  rootClassName?: string;
  fallbackPath?: string;
  onRouteChange?: (path: string, route: AppRoute | null) => void;
  appDocumentTitle?: string;
  /**
   * Fade/slide transitions on **`main.abey-outlet`** during route changes.
   * Default **`true`**; set **`false`** for instant swaps (fewer waits; good for dense doc UIs).
   * **`prefers-reduced-motion: reduce`** already disables animations when **`true`**.
   */
  outletRouteTransition?: boolean;
  /**
   * Variables CSS (tokens Omega) escritas inline en el host del shell. Sobrescaden `omega-default.css`.
   * Fusión: `themeVars` + (`themeVarsDark` si `abey--dark` | `themeVarsLight` si claro), ante `appearance`, persistencia y el toggle.
   *
   * Claves pueden omitir el prefijo `--` (ej. `abey-accent`).
   *
   * Ejemplo: `themeVars: { "--abey-radius-sm": "8px", "--abey-accent": "#2563eb" }`, `themeVarsDark: { "abey-accent": "#38bdf8" }`.
   */
  themeVars?: ShellThemeVars;
  /** Capa sólo modo oscuro (`abey--dark`). */
  themeVarsDark?: ShellThemeVars;
  /** Capa sólo modo claro. */
  themeVarsLight?: ShellThemeVars;
  /** Contenedor de rutas (**`mountAppShell`**). Ignorado en landing/blank. */
  sidebarMenuMode?: ShellSidebarMenuMode;
};

export type NavItem = {
  path: string;
  label: string;
  pathNorm: string;
  icon?: string;
  iconFa?: string;
  children?: NavItem[];
};

/**
 * Builds shell DOM: admin sidebar + **`main.abey-outlet`** or landing top bar (**`blank`** = outlet only).
 * Pair with **`createPathRouter`** manually if you skip **`mountRoutedApp`** orchestration.
 */
/** Acciones demo: `iconFa` asume FA 6 en `index.html`; sin FA, usa `appBarActions` con `icon` texto. */
export function defaultShellAppBarActions(): ShellAppBarAction[] {
  return [
    { ariaLabel: "Avisos", iconFa: "fa-regular fa-bell" },
    { ariaLabel: "Mensajes", iconFa: "fa-regular fa-envelope" },
    { ariaLabel: "Cuenta", iconFa: "fa-regular fa-circle-user" },
  ];
}

function resolveShellAppBarActions(opts: {
  appBarActions?: ShellAppBarAction[];
  appBarActionsAppend?: ShellAppBarAction[];
}): ShellAppBarAction[] {
  const base = opts.appBarActions !== undefined ? [...opts.appBarActions] : defaultShellAppBarActions();
  if (opts.appBarActionsAppend?.length) {
    return [...base, ...opts.appBarActionsAppend];
  }
  return base;
}

let abeyShellAppBarMenuUid = 0;
function nextAbeyShellAppBarMenuId(): string {
  abeyShellAppBarMenuUid += 1;
  return `abey-appbar-dropdown-${abeyShellAppBarMenuUid}`;
}

function closeSiblingAppBarDropdowns(tools: HTMLElement, exceptWrap: HTMLElement): void {
  for (const wrap of Array.from(tools.querySelectorAll(".abey-appbar__dropdown"))) {
    if (!(wrap instanceof HTMLElement) || wrap === exceptWrap) {
      continue;
    }
    const panel = wrap.querySelector<HTMLElement>(".abey-appbar__dropdown-panel");
    const trig = wrap.querySelector<HTMLButtonElement>(".abey-appbar__dropdown-trigger");
    if (panel?.hidden === false) {
      panel.hidden = true;
      trig?.setAttribute("aria-expanded", "false");
    }
  }
}

function renderDropdownRowContent(row: HTMLElement, item: ShellAppBarDropdownItem): void {
  const faRaw = item.iconFa?.trim() ?? "";
  const iconRaw = item.icon?.trim() ?? "";
  if (faRaw !== "") {
    const i = document.createElement("i");
    i.setAttribute("aria-hidden", "true");
    for (const c of faRaw.split(/\s+/).filter(Boolean)) i.classList.add(c);
    row.appendChild(i);
  } else if (iconRaw !== "") {
    row.appendChild(document.createTextNode(iconRaw));
  }
  const sp = document.createElement("span");
  sp.className = "abey-appbar__dropdown-item-label";
  sp.textContent = item.label.trim();
  row.appendChild(sp);
}

/**
 * Botón (+ panel) del app bar con **`dropdownMenu`**. Cierra al Escape, clic fuera y al elegir **`button`**.
 */
function mountAppBarDropdownAction(
  tools: HTMLElement,
  act: ShellAppBarAction,
  items: ShellAppBarDropdownItem[],
  registerDispose: (fn: () => void) => void,
): void {
  const wrap = document.createElement("div");
  wrap.className = "abey-appbar__dropdown";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "abey-appbar__action abey-appbar__dropdown-trigger";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-haspopup", "true");
  const menuId = nextAbeyShellAppBarMenuId();
  btn.id = `${menuId}-trigger`;
  btn.setAttribute("aria-label", act.ariaLabel);

  renderAppBarActionTrigger(btn, act);

  const panel = document.createElement("div");
  panel.id = menuId;
  panel.className = "abey-appbar__dropdown-panel";
  panel.setAttribute("role", "menu");
  panel.hidden = true;
  panel.setAttribute("aria-labelledby", btn.id);

  const setOpen = (open: boolean): void => {
    if (open) {
      closeSiblingAppBarDropdowns(tools, wrap);
    }
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      queueMicrotask(() => {
        const first = panel.querySelector<HTMLElement>(
          "button.abey-appbar__dropdown-item:not([hidden]), a.abey-appbar__dropdown-item",
        );
        try {
          first?.focus({ preventScroll: true });
        } catch {
          /* */
        }
      });
    }
  };

  for (const item of items) {
    const label = item.label.trim();
    const aria = item.ariaLabel?.trim() || label;
    const href = item.href?.trim() ?? "";

    let row: HTMLElement;
    if (href !== "") {
      const a = document.createElement("a");
      a.className = "abey-appbar__dropdown-item";
      a.href = href;
      a.setAttribute("role", "menuitem");
      a.setAttribute("aria-label", aria);
      const tRaw = item.target?.trim();
      if (tRaw) a.target = tRaw;
      const rRaw = item.rel?.trim();
      if (rRaw) {
        a.rel = rRaw;
      } else if (tRaw === "_blank") {
        a.rel = "noopener noreferrer";
      }
      renderDropdownRowContent(a, item);
      a.addEventListener("click", () => setOpen(false));
      row = a;
    } else {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "abey-appbar__dropdown-item";
      b.setAttribute("role", "menuitem");
      b.setAttribute("aria-label", aria);
      renderDropdownRowContent(b, item);
      b.addEventListener("click", (ev) => {
        ev.preventDefault();
        item.onClick?.();
        setOpen(false);
      });
      row = b;
    }
    panel.appendChild(row);
  }

  const onDocClick = (ev: MouseEvent): void => {
    if (!(ev.target instanceof Node) || wrap.contains(ev.target)) {
      return;
    }
    setOpen(false);
  };
  const onDocKey = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape" && !panel.hidden) {
      ev.stopPropagation();
      setOpen(false);
      try {
        btn.focus({ preventScroll: true });
      } catch {
        /* */
      }
    }
  };
  document.addEventListener("click", onDocClick, true);
  document.addEventListener("keydown", onDocKey, true);
  registerDispose(() => document.removeEventListener("click", onDocClick, true));
  registerDispose(() => document.removeEventListener("keydown", onDocKey, true));

  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setOpen(panel.hidden);
  });

  wrap.appendChild(btn);
  wrap.appendChild(panel);
  tools.appendChild(wrap);
}

function renderAppBarActionBody(btn: HTMLButtonElement, act: ShellAppBarAction): void {
  const faRaw = act.iconFa?.trim() ?? "";
  const iconRaw = act.icon?.trim() ?? "";
  const labelRaw = act.label?.trim() ?? "";
  const hasLabel = labelRaw !== "";
  if (hasLabel) {
    btn.classList.add("abey-appbar__action--labeled");
  }
  if (faRaw !== "") {
    const i = document.createElement("i");
    for (const c of faRaw.split(/\s+/).filter(Boolean)) {
      i.classList.add(c);
    }
    i.setAttribute("aria-hidden", "true");
    btn.appendChild(i);
  } else if (iconRaw !== "") {
    btn.appendChild(document.createTextNode(iconRaw));
  } else if (hasLabel) {
    const sp = document.createElement("span");
    sp.className = "abey-appbar__action-txt";
    sp.textContent = labelRaw;
    btn.appendChild(sp);
    return;
  } else {
    btn.appendChild(document.createTextNode(act.ariaLabel.charAt(0).toUpperCase()));
  }
  if (hasLabel) {
    const sp = document.createElement("span");
    sp.className = "abey-appbar__action-txt";
    sp.textContent = labelRaw;
    btn.appendChild(sp);
  }
}

/** Contenido del botón (**avatar** opcional · icono **`iconFa`** · **`label`**). */
function renderAppBarActionTrigger(btn: HTMLButtonElement, act: ShellAppBarAction): void {
  const avatar = act.avatarSrc?.trim();
  if (avatar) {
    btn.classList.add("abey-appbar__action--avatar");
    const img = document.createElement("img");
    img.className = "abey-appbar__action-avatar-img";
    img.src = avatar;
    img.alt = act.avatarAlt?.trim() || act.ariaLabel;
    img.decoding = "async";
    img.draggable = false;
    btn.appendChild(img);
    const labelRaw = act.label?.trim() ?? "";
    if (labelRaw !== "") {
      btn.classList.add("abey-appbar__action--labeled");
      const sp = document.createElement("span");
      sp.className = "abey-appbar__action-txt";
      sp.textContent = labelRaw;
      btn.appendChild(sp);
    }
    return;
  }
  renderAppBarActionBody(btn, act);
}

export type MountAppShellAppearanceToggle = {
  mode: ShellAppearanceMode;
  root: HTMLElement;
  persist: boolean;
  /** Tras aplicar clase **`abey--dark`** (inicio y cada clic ☀️/🌙). */
  onAfterAppearanceApply?: (mode: ShellAppearanceMode) => void;
};

function readStoredAppearance(): ShellAppearanceMode | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  try {
    const raw = globalThis.localStorage.getItem(ABEY_SHELL_APPEARANCE_STORAGE_KEY)?.trim();
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null;
  }
}

/** Admin shell palette: stored preference or **`preferred`** fallback. */
export function getResolvedAdminAppearance(opts: {
  preferred: ShellAppearanceMode;
  persist: boolean;
}): ShellAppearanceMode {
  const { preferred, persist } = opts;
  if (persist) {
    const s = readStoredAppearance();
    if (s) return s;
  }
  return preferred;
}

function mountAppearanceToggleButton(tools: HTMLElement, at: MountAppShellAppearanceToggle): void {
  let mode = at.mode;
  const tb = document.createElement("button");
  tb.type = "button";
  tb.className = "abey-appbar__action abey-appbar__action--theme";
  const syncThemeBtn = (): void => {
    at.root.classList.toggle("abey--dark", mode === "dark");
    tb.replaceChildren();
    const ic = document.createElement("i");
    ic.setAttribute("aria-hidden", "true");
    ic.className = mode === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    tb.appendChild(ic);
    tb.setAttribute("aria-label", mode === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    at.onAfterAppearanceApply?.(mode);
  };
  tb.addEventListener("click", (e) => {
    e.preventDefault();
    mode = mode === "dark" ? "light" : "dark";
    if (at.persist) {
      try {
        globalThis.localStorage?.setItem(ABEY_SHELL_APPEARANCE_STORAGE_KEY, mode);
      } catch {
        /* */
      }
    }
    syncThemeBtn();
  });
  syncThemeBtn();
  tools.appendChild(tb);
}

export function mountAppShell(
  root: HTMLElement,
  config: {
    brand: string;
    subBrand?: string;
    variant: ShellVariant;
    nav: NavItem[];
    currentPath: string;
    onNavigate: (path: string) => void;
    /** Default **dashboard** chrome when omitted (**logo stripe**, actions row). */
    dashboardLayout?: boolean;
    logoMark?: string;
    brandLogoSrc?: string;
    brandLogoAlt?: string;
    brandTitleSplit?: { lead: string; tail: string };
    appBarActions?: ShellAppBarAction[];
    appBarActionsAppend?: ShellAppBarAction[];
    appearanceToggle?: MountAppShellAppearanceToggle;
    /** Ver **`ShellSidebarMenuMode`**. */
    sidebarMenuMode?: ShellSidebarMenuMode;
    /** Same as **`MountRoutedAppConfig.appBarInset`**. */
    appBarInset?: HTMLElement;
  },
): {
  shellRoot: HTMLElement;
  outlet: HTMLElement;
  setCurrentPath: (path: string) => void;
  dispose: () => void;
} {
  const isDashboard = config.variant === "admin" && config.dashboardLayout !== false;
  /** Listeners **`document`** de menús app bar (cierra fuera del shell al **`dispose`**). */
  const disposeAppBarExtras: Array<() => void> = [];

  const shellRoot = document.createElement("div");
  // Single `.abey` on `#app` only so `--abey-*` tokens inherit (nested `.abey` would reset the light palette).
  shellRoot.className = `abey-shell abey-shell--${config.variant}`.trim();
  if (isDashboard) {
    shellRoot.classList.add("abey-shell--dashboard");
  }

  const navMenuModeResolved: ShellSidebarMenuMode =
    config.variant !== "admin" ? "static" : (config.sidebarMenuMode ?? "static");
  shellRoot.dataset.abeyNavMode = navMenuModeResolved;

  if (config.variant === "blank") {
    const outlet = document.createElement("main");
    outlet.className = "abey-outlet";
    shellRoot.appendChild(outlet);
    root.appendChild(shellRoot);
    return {
      shellRoot,
      outlet,
      setCurrentPath: () => {
        /* no nav */
      },
      dispose: () => {
        try {
          root.removeChild(shellRoot);
        } catch {
          /* */
        }
      },
    };
  }

  /** Menú lateral: en overlay/drawer + dashboard el ☰ va en la app bar (escritorio); en móvil sigue en el aside. */
  const navRailToggleButtons: HTMLButtonElement[] = [];

  const appbar = document.createElement("header");
  appbar.className = "abey-appbar";
  if (isDashboard) {
    appbar.classList.add("abey-appbar--dashboard");
  }
  const appbarIn = document.createElement("div");
  appbarIn.className = "abey-appbar__inner";
  if (isDashboard) {
    const row = document.createElement("div");
    row.className = "abey-appbar__row";
    const useAppbarOverlayToggle =
      config.variant === "admin" &&
      (navMenuModeResolved === "overlay" || navMenuModeResolved === "drawer");
    if (useAppbarOverlayToggle) {
      const appbarToggle = createSidebarNavToggleButton();
      appbarToggle.classList.add("abey-appbar__nav-toggle");
      row.appendChild(appbarToggle);
      navRailToggleButtons.push(appbarToggle);
    }
    const mark = document.createElement("div");
    mark.className = "abey-appbar__mark";
    const logoSrc = config.brandLogoSrc?.trim();
    if (logoSrc !== undefined && logoSrc !== "") {
      const img = document.createElement("img");
      img.className = "abey-appbar__mark-logo";
      img.alt = (config.brandLogoAlt?.trim() ? config.brandLogoAlt.trim() : config.brand) ?? "";
      img.src = logoSrc;
      img.loading = "eager";
      img.decoding = "async";
      img.draggable = false;
      mark.appendChild(img);
    }
    const textWrap = document.createElement("div");
    textWrap.className = "abey-appbar__mark-text";
    const logoMarkRaw = config.logoMark?.trim();
    const split = config.brandTitleSplit;
    const splitLead = split?.lead.trim();
    const splitTail = split?.tail.trim();
    const useSplit = !logoMarkRaw && !!(splitLead && splitTail);
    if (useSplit && splitLead && splitTail) {
      const row = document.createElement("span");
      row.className = "abey-appbar__mark-heading";
      const lead = document.createElement("span");
      lead.className = "abey-appbar__mark-title abey-appbar__mark-title--lead";
      lead.textContent = splitLead;
      const tailSp = document.createElement("span");
      tailSp.className = "abey-appbar__mark-title abey-appbar__mark-title--tail";
      tailSp.textContent = splitTail;
      row.appendChild(lead);
      row.appendChild(tailSp);
      textWrap.appendChild(row);
    } else {
      const t = document.createElement("span");
      t.className = "abey-appbar__mark-title";
      t.textContent = (logoMarkRaw ? logoMarkRaw : config.brand) ?? config.brand;
      textWrap.appendChild(t);
    }
    if (config.subBrand) {
      const su = document.createElement("span");
      su.className = "abey-appbar__mark-sub";
      su.textContent = config.subBrand;
      textWrap.appendChild(su);
    }
    mark.appendChild(textWrap);
    const spacer = document.createElement("div");
    spacer.className = "abey-appbar__spacer";
    spacer.setAttribute("aria-hidden", "true");
    row.appendChild(mark);
    if (navMenuModeResolved === "horizontal") {
      const hzNavRow = document.createElement("nav");
      hzNavRow.className = "abey-shell__nav-horizontal";
      hzNavRow.setAttribute("aria-label", "Principal");
      fillHorizontalNav(hzNavRow, config.nav, config.currentPath, config.onNavigate, {
        withNavIcons: isDashboard,
      });
      row.appendChild(hzNavRow);
    } else {
      row.appendChild(spacer);
    }
    if (config.appBarInset) {
      config.appBarInset.classList.add("abey-appbar__inset");
      row.appendChild(config.appBarInset);
    }
    const tools = document.createElement("div");
    tools.className = "abey-appbar__tools";
    const atDash = config.appearanceToggle;
    if (atDash) mountAppearanceToggleButton(tools, atDash);
    const actions = resolveShellAppBarActions({
      appBarActions: config.appBarActions,
      appBarActionsAppend: config.appBarActionsAppend,
    });
    for (const act of actions) {
      const menuItems = (act.dropdownMenu ?? []).filter((it) => it.label.trim() !== "");
      if (menuItems.length > 0) {
        mountAppBarDropdownAction(tools, act, menuItems, (fn) => {
          disposeAppBarExtras.push(fn);
        });
        continue;
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "abey-appbar__action";
      b.setAttribute("aria-label", act.ariaLabel);
      renderAppBarActionTrigger(b, act);
      b.addEventListener("click", (e) => {
        e.preventDefault();
        act.onClick?.();
      });
      tools.appendChild(b);
    }
    row.appendChild(tools);
    appbarIn.appendChild(row);
  } else {
    const brand = document.createElement("div");
    brand.className = "abey-appbar__brand";
    const t = document.createElement("span");
    t.className = "abey-appbar__title";
    t.textContent = config.brand;
    brand.appendChild(t);
    if (config.subBrand) {
      const su = document.createElement("span");
      su.className = "abey-appbar__subtitle";
      su.textContent = config.subBrand;
      brand.appendChild(su);
    }
    appbarIn.appendChild(brand);
    const atCompact = config.appearanceToggle;
    if (config.variant === "admin" && atCompact) {
      const spacerBar = document.createElement("div");
      spacerBar.className = "abey-appbar__spacer";
      spacerBar.setAttribute("aria-hidden", "true");
      const toolsCompact = document.createElement("div");
      toolsCompact.className = "abey-appbar__tools";
      mountAppearanceToggleButton(toolsCompact, atCompact);
      appbarIn.appendChild(spacerBar);
      appbarIn.appendChild(toolsCompact);
    }
    if (config.variant === "landing") {
      const nav = document.createElement("nav");
      nav.className = "abey-appbar__nav";
      nav.setAttribute("aria-label", "Principal");
      fillHorizontalNav(nav, config.nav, config.currentPath, config.onNavigate);
      appbarIn.appendChild(nav);
    }
  }
  appbar.appendChild(appbarIn);

  const body = document.createElement("div");
  body.className = "abey-shell__body";
  /** Limpieza del listener Escape (solo overlay / drawer). */
  let disposeOverlayEscape: (() => void) | undefined;
  const outlet = document.createElement("main");
  outlet.className = config.variant === "landing" ? "abey-outlet abey-outlet--landing" : "abey-outlet";
  if (isDashboard) {
    outlet.classList.add("abey-outlet--dashboard");
  }
  outlet.setAttribute("id", "abey-outlet");

  if (config.variant === "admin") {
    if (navMenuModeResolved !== "horizontal") {
      const aside = document.createElement("aside");
      aside.className = isDashboard ? "abey-sidebar abey-sidebar--dashboard" : "abey-sidebar";
      const toggle = createSidebarNavToggleButton();
      const sNav = document.createElement("nav");
      sNav.id = "abey-side-nav";
      sNav.className = "abey-sidebar__nav";
      sNav.setAttribute("aria-label", "Principal");
      const sideInner = document.createElement("div");
      sideInner.className = "abey-sidebar__inner";
      const sn = document.createElement("div");
      sn.className = "abey-nav-stack";
      appendSidebarNav(sn, config.nav, config.currentPath, config.onNavigate, isDashboard);
      sideInner.appendChild(sn);
      sNav.appendChild(toggle);
      sNav.appendChild(sideInner);
      aside.appendChild(sNav);
      body.appendChild(aside);
      const closeDesk =
        navMenuModeResolved === "overlay" || navMenuModeResolved === "drawer";
      let overlayScrim: HTMLButtonElement | undefined;
      if (closeDesk) {
        const scrim = document.createElement("button");
        scrim.type = "button";
        scrim.className = "abey-shell__nav-scrim";
        scrim.setAttribute("aria-label", "Cerrar panel de navegación");
        scrim.setAttribute("aria-hidden", "true");
        body.appendChild(scrim);
        overlayScrim = scrim;
      }
      navRailToggleButtons.push(toggle);
      disposeOverlayEscape = onToggle(
        navRailToggleButtons,
        aside,
        sNav,
        closeDesk ? { closeNavOnPickDesktop: true, overlayScrim } : undefined,
      );
    }
  }

  body.appendChild(outlet);
  shellRoot.appendChild(appbar);
  shellRoot.appendChild(body);
  root.appendChild(shellRoot);

  const clickOff = (ev: MouseEvent): void => {
    const t = ev.target;
    if (!(t instanceof Element)) {
      return;
    }
    const a = t.closest("a[href]") as HTMLAnchorElement | null;
    if (!a || !shellRoot.contains(a)) {
      return;
    }
    const h = a.getAttribute("href");
    if (!h || h.startsWith("#") || a.target === "_blank" || a.hasAttribute("download")) {
      return;
    }
    if (!h.startsWith("/")) {
      return;
    }
    try {
      const u = new URL(a.href, window.location.origin);
      if (u.origin !== window.location.origin) {
        return;
      }
    } catch {
      return;
    }
    ev.preventDefault();
    const path = h.split("?")[0] as string;
    if (path) {
      config.onNavigate(path);
    }
  };
  shellRoot.addEventListener("click", clickOff);

  let lastNavHighlightPath: string | null = null;
  const setCurrentPath = (p: string): void => {
    const cur = normalizePathname(p);
    if (lastNavHighlightPath === cur) {
      return;
    }
    lastNavHighlightPath = cur;
    for (const el of Array.from(shellRoot.querySelectorAll<HTMLAnchorElement>("[data-abey-path]"))) {
      const raw = el.dataset.abeyPath;
      if (!raw) {
        continue;
      }
      const m = normalizePathname(raw) === cur;
      el.setAttribute("aria-current", m ? "page" : "false");
      el.classList.toggle("abey-nav-link--active", m);
    }
    for (const det of Array.from(shellRoot.querySelectorAll("details.abey-nav-tree"))) {
      if (!(det instanceof HTMLDetailsElement)) continue;
      let open = false;
      for (const a of Array.from(det.querySelectorAll<HTMLAnchorElement>("a[data-abey-path]"))) {
        const raw = a.dataset.abeyPath;
        if (raw && normalizePathname(raw) === cur) {
          open = true;
          break;
        }
      }
      if (det.open !== open) {
        det.open = open;
      }
    }
    for (const hz of Array.from(shellRoot.querySelectorAll("details.abey-nav-hz"))) {
      if (!(hz instanceof HTMLDetailsElement)) continue;
      hz.classList.remove("abey-nav-hz--branch-active");
    }
    const hzActs = Array.from(
      shellRoot.querySelectorAll("a.abey-nav-link--active[data-abey-path]"),
      (x) => x as HTMLAnchorElement,
    );
    for (let i = hzActs.length - 1; i >= 0; i--) {
      const hzDet = hzActs[i]!.closest("details.abey-nav-hz");
      if (!(hzDet instanceof HTMLDetailsElement)) continue;
      hzDet.classList.add("abey-nav-hz--branch-active");
      break;
    }
  };

  setCurrentPath(config.currentPath);

  return {
    shellRoot,
    outlet,
    setCurrentPath,
    dispose: () => {
      for (const fn of disposeAppBarExtras) {
        try {
          fn();
        } catch {
          /* */
        }
      }
      shellRoot.removeEventListener("click", clickOff);
      disposeOverlayEscape?.();
    },
  };
}

function createSidebarNavToggleButton(): HTMLButtonElement {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "abey-sidebar__toggle";
  toggle.setAttribute("aria-label", "Menú");
  toggle.setAttribute("aria-controls", "abey-side-nav");
  toggle.appendChild(document.createTextNode("☰"));
  return toggle;
}

function focusFirstVisibleNavToggle(buttons: readonly HTMLButtonElement[]): void {
  const narrow =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 900px)").matches
      : false;
  const order = narrow ? [...buttons].reverse() : [...buttons];
  for (const b of order) {
    if (typeof window !== "undefined" && window.getComputedStyle(b).display === "none") {
      continue;
    }
    try {
      b.focus({ preventScroll: true });
      return;
    } catch {
      /* */
    }
  }
}

function onToggle(
  buttons: readonly HTMLButtonElement[],
  aside: HTMLElement,
  nav: HTMLElement,
  opts?: { closeNavOnPickDesktop?: boolean; overlayScrim?: HTMLButtonElement },
): (() => void) | undefined {
  if (buttons.length === 0) {
    return undefined;
  }
  const overlayScrim = opts?.overlayScrim;
  const syncScrim = (open: boolean): void => {
    if (!overlayScrim) {
      return;
    }
    if (open) {
      overlayScrim.setAttribute("data-abey-active", "true");
      overlayScrim.removeAttribute("aria-hidden");
      overlayScrim.removeAttribute("tabindex");
    } else {
      overlayScrim.removeAttribute("data-abey-active");
      overlayScrim.setAttribute("aria-hidden", "true");
      overlayScrim.setAttribute("tabindex", "-1");
    }
  };
  const sync = (open: boolean): void => {
    aside.setAttribute("data-abey-open", open ? "true" : "false");
    const exp = open ? "true" : "false";
    for (const button of buttons) {
      button.setAttribute("aria-expanded", exp);
    }
    syncScrim(open);
  };
  overlayScrim?.setAttribute("tabindex", "-1");
  overlayScrim?.addEventListener("click", () => sync(false));
  sync(false);
  for (const button of buttons) {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = aside.getAttribute("data-abey-open") !== "true";
      sync(open);
    });
  }
  nav.addEventListener("click", (e) => {
    if (e.target instanceof HTMLAnchorElement && e.target.closest("a[href]")) {
      const mq = window.matchMedia("(max-width: 900px)").matches;
      if (mq || opts?.closeNavOnPickDesktop) {
        sync(false);
      }
    }
  });
  if (typeof window === "undefined" || !overlayScrim) {
    return undefined;
  }
  const onEscape = (e: KeyboardEvent): void => {
    if (e.key !== "Escape" || aside.getAttribute("data-abey-open") !== "true") {
      return;
    }
    sync(false);
    focusFirstVisibleNavToggle(buttons);
  };
  window.addEventListener("keydown", onEscape);
  return () => window.removeEventListener("keydown", onEscape);
}

function navSubtreeContainsCurrent(it: NavItem, currentRaw: string): boolean {
  const cur = normalizePathname(currentRaw);
  if (normalizePathname(it.pathNorm) === cur) return true;
  return it.children?.some((c) => navSubtreeContainsCurrent(c, currentRaw)) ?? false;
}

function appendSidebarNav(
  parent: HTMLElement,
  items: NavItem[],
  current: string,
  onNavigate: (p: string) => void,
  withNavIcons: boolean,
): void {
  const cur = normalizePathname(current);
  for (const it of items) {
    if (it.children?.length) {
      const details = document.createElement("details");
      details.className = "abey-nav-tree";
      if (navSubtreeContainsCurrent(it, current)) {
        details.open = true;
      }
      const summary = document.createElement("summary");
      summary.className = "abey-nav-tree__summary";
      if (withNavIcons) {
        const ic = document.createElement("span");
        ic.className = "abey-nav-tree__summary-ic";
        ic.setAttribute("aria-hidden", "true");
        const faRaw = it.iconFa?.trim() ?? "";
        if (faRaw !== "") {
          const ifa = document.createElement("i");
          for (const c of faRaw.split(/\s+/).filter(Boolean)) {
            ifa.classList.add(c);
          }
          ifa.setAttribute("aria-hidden", "true");
          ic.appendChild(ifa);
        } else {
          const raw = it.icon?.trim() ?? "";
          ic.textContent = raw !== "" ? raw : it.label.charAt(0).toUpperCase();
        }
        const tx = document.createElement("span");
        tx.className = "abey-nav-tree__summary-txt";
        tx.textContent = it.label;
        summary.appendChild(ic);
        summary.appendChild(tx);
      } else {
        summary.textContent = it.label;
      }
      const subs = document.createElement("div");
      subs.className = "abey-nav-tree__subs";
      appendSidebarNav(subs, it.children, current, onNavigate, withNavIcons);
      details.appendChild(summary);
      details.appendChild(subs);
      parent.appendChild(details);
    } else {
      parent.appendChild(
        makeNavLink(it, cur, onNavigate, "abey-nav-link--sidebar", withNavIcons ? { withNavIcons: true } : undefined),
      );
    }
  }
}

function hzRenderSummary(summary: HTMLElement, it: NavItem, withNavIcons: boolean): void {
  summary.textContent = "";
  if (withNavIcons) {
    const ic = document.createElement("span");
    ic.className = "abey-nav-hz__ic";
    ic.setAttribute("aria-hidden", "true");
    const faRaw = it.iconFa?.trim() ?? "";
    if (faRaw !== "") {
      const ifa = document.createElement("i");
      for (const c of faRaw.split(/\s+/).filter(Boolean)) {
        ifa.classList.add(c);
      }
      ifa.setAttribute("aria-hidden", "true");
      ic.appendChild(ifa);
    } else {
      const raw = it.icon?.trim() ?? "";
      ic.textContent = raw !== "" ? raw : it.label.charAt(0).toUpperCase();
    }
    const tx = document.createElement("span");
    tx.className = "abey-nav-hz__txt";
    tx.textContent = it.label;
    summary.appendChild(ic);
    summary.appendChild(tx);
  } else {
    const tx = document.createElement("span");
    tx.className = "abey-nav-hz__txt";
    tx.textContent = it.label;
    summary.appendChild(tx);
  }
}

function hzCloseAncestorDetails(trigger: HTMLElement): void {
  let node: HTMLElement | null = trigger;
  while (node) {
    const detailWrap: Element | null = node.closest("details.abey-nav-hz");
    if (!(detailWrap instanceof HTMLDetailsElement)) break;
    detailWrap.open = false;
    node = detailWrap.parentElement;
  }
}

function appendHorizontalPanelNav(
  panel: HTMLElement,
  items: NavItem[],
  cur: string,
  currentRaw: string,
  onNavigate: (p: string) => void,
  withNavIcons: boolean,
): void {
  for (const it of items) {
    if (it.children?.length) {
      panel.appendChild(buildHorizontalNavGroup(it, cur, currentRaw, onNavigate, withNavIcons));
    } else {
      const a = makeNavLink(
        it,
        cur,
        onNavigate,
        "abey-nav-link--horizontal abey-nav-link--hz-drop",
        withNavIcons ? { withNavIcons: true } : undefined,
      );
      panel.appendChild(a);
    }
  }
}

function buildHorizontalNavGroup(
  it: NavItem,
  cur: string,
  currentRaw: string,
  onNavigate: (p: string) => void,
  withNavIcons: boolean,
): HTMLElement {
  const details = document.createElement("details");
  details.className = "abey-nav-hz";
  if (navSubtreeContainsCurrent(it, currentRaw)) {
    details.classList.add("abey-nav-hz--branch-active");
  }
  const summary = document.createElement("summary");
  summary.className = "abey-nav-hz__summary";
  summary.setAttribute(
    "aria-label",
    withNavIcons ? `${it.label}, desplegable` : `${it.label}, submenu`,
  );
  hzRenderSummary(summary, it, withNavIcons);
  const panel = document.createElement("div");
  panel.className = "abey-nav-hz__panel";
  appendHorizontalPanelNav(panel, it.children ?? [], cur, currentRaw, onNavigate, withNavIcons);
  panel.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const a = t.closest("a[href]");
    if (!(a instanceof HTMLAnchorElement) || !panel.contains(a)) return;
    queueMicrotask(() => {
      hzCloseAncestorDetails(a);
    });
  });
  details.appendChild(summary);
  details.appendChild(panel);
  return details;
}

function fillHorizontalNav(
  el: HTMLElement,
  items: NavItem[],
  current: string,
  onNavigate: (p: string) => void,
  opts?: { withNavIcons?: boolean },
): void {
  const cur = normalizePathname(current);
  const withIc = !!opts?.withNavIcons;
  for (const it of items) {
    if (it.children?.length) {
      el.appendChild(buildHorizontalNavGroup(it, cur, current, onNavigate, withIc));
    } else {
      el.appendChild(
        makeNavLink(it, cur, onNavigate, "abey-nav-link--horizontal", withIc ? { withNavIcons: true } : undefined),
      );
    }
  }
}

function appRouteToNavItem(r: AppRoute): NavItem | null {
  if (r.path === "*" || r.showInNav === false || !r.label.trim()) return null;
  const pathNorm = r.path.startsWith("/") ? r.path : `/${r.path}`;
  const children = r.navChildren?.length
    ? r.navChildren.map(navChildToNavItem).filter((c): c is NavItem => c !== null)
    : undefined;
  const node: NavItem = {
    path: r.path,
    label: r.label,
    pathNorm,
    icon: r.navIcon,
    iconFa: r.navIconFa,
  };
  if (children?.length) node.children = children;
  return node;
}

function navChildToNavItem(c: AppRouteNavChild): NavItem | null {
  const label = String(c.label ?? "").trim();
  const pathRaw = String(c.path ?? "").trim();
  if (!label || !pathRaw) return null;
  const pathNorm = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
  const children = c.children?.length
    ? c.children.map(navChildToNavItem).filter((x): x is NavItem => x !== null)
    : undefined;
  const node: NavItem = {
    path: pathRaw,
    label,
    pathNorm,
    icon: c.navIcon,
    iconFa: c.navIconFa,
  };
  if (children?.length) node.children = children;
  return node;
}

function makeNavLink(
  it: NavItem,
  current: string,
  onNavigate: (p: string) => void,
  extra: string,
  opts?: { withNavIcons?: boolean },
): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = `abey-nav-link ${extra}`.trim();
  a.href = it.pathNorm;
  a.dataset.abeyPath = it.pathNorm;
  if (opts?.withNavIcons) {
    a.classList.add("abey-nav-link--with-icon");
    a.textContent = "";
    const ic = document.createElement("span");
    ic.className = "abey-nav-link__ic";
    ic.setAttribute("aria-hidden", "true");
    const faRaw = it.iconFa?.trim() ?? "";
    if (faRaw !== "") {
      const ifa = document.createElement("i");
      for (const c of faRaw.split(/\s+/).filter(Boolean)) {
        ifa.classList.add(c);
      }
      ifa.setAttribute("aria-hidden", "true");
      ic.appendChild(ifa);
    } else {
      const raw = it.icon?.trim() ?? "";
      ic.textContent = raw !== "" ? raw : it.label.charAt(0).toUpperCase();
    }
    const tx = document.createElement("span");
    tx.className = "abey-nav-link__txt";
    tx.textContent = it.label;
    a.appendChild(ic);
    a.appendChild(tx);
  } else {
    a.textContent = it.label;
  }
  a.addEventListener("click", (e) => {
    e.preventDefault();
    onNavigate(it.pathNorm);
  });
  a.setAttribute("aria-current", normalizePathname(it.pathNorm) === current ? "page" : "false");
  a.classList.toggle("abey-nav-link--active", normalizePathname(it.pathNorm) === current);
  return a;
}

function readOutletRouteDurMs(el: HTMLElement, prop: "--abey-route-dur-out" | "--abey-route-dur-in", fallbackMs: number): number {
  let raw = "";
  try {
    raw = getComputedStyle(el).getPropertyValue(prop).trim().toLowerCase();
  } catch {
    return fallbackMs;
  }
  if (raw.endsWith("ms")) {
    const n = Number.parseFloat(raw.slice(0, -2));
    return Number.isFinite(n) ? n : fallbackMs;
  }
  if (raw.endsWith("s")) {
    const n = Number.parseFloat(raw.slice(0, -1)) * 1000;
    return Number.isFinite(n) ? n : fallbackMs;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallbackMs;
}

function normalizeShellThemeVarKey(rawKey: string): string {
  const t = rawKey.trim();
  return t.startsWith("--") ? t : `--${t}`;
}

/** Aplica/sobrescribe variables CSS Omega en **`root`**; se limpia en dispose o al **`apply`** siguiente. */
function createShellHostThemeBinder(
  root: HTMLElement,
  cfg: Pick<MountRoutedAppConfig, "themeVars" | "themeVarsDark" | "themeVarsLight">,
): { apply(mode: ShellAppearanceMode): void; clear(): void } {
  let appliedKeys: string[] = [];

  const clear = (): void => {
    for (const k of appliedKeys) {
      root.style.removeProperty(k);
    }
    appliedKeys = [];
  };

  const apply = (mode: ShellAppearanceMode): void => {
    clear();
    const layered = mode === "dark" ? cfg.themeVarsDark : cfg.themeVarsLight;
    const merged: ShellThemeVars = { ...(cfg.themeVars ?? {}), ...(layered ?? {}) };
    const nextKeys: string[] = [];
    for (const [rawK, rawV] of Object.entries(merged)) {
      const trimmed = typeof rawV === "string" ? rawV.trim() : "";
      if (!trimmed) {
        continue;
      }
      const k = normalizeShellThemeVarKey(rawK);
      root.style.setProperty(k, trimmed);
      nextKeys.push(k);
    }
    appliedKeys = nextKeys;
  };

  return { apply, clear };
}

/**
 * **`mountAppShell`** + **`createPathRouter`** + **`AppRoute`** resolution + **`document.title`** updates.
 * Apps import **`@abeyjs/view/theme/omega-default.css`** explicitly.
 */
export function mountRoutedApp(
  root: HTMLElement,
  config: MountRoutedAppConfig,
): { router: ReturnType<typeof createPathRouter>; outlet: HTMLElement; dispose: () => void } {
  if (config.routes.length === 0) {
    throw new Error("mountRoutedApp: at least one route is required.");
  }
  const router = createPathRouter();
  const useDashboard = config.variant === "admin" && config.dashboardLayout !== false;
  const navList: NavItem[] = config.routes
    .filter((r) => r.path !== "*" && r.showInNav !== false && r.label.trim() !== "")
    .map((r) => appRouteToNavItem(r))
    .filter((x): x is NavItem => x !== null);

  if (!matchAppRoute(router.getPath(), config.routes)) {
    const fb = config.fallbackPath ?? firstNavPath(config.routes);
    if (fb) {
      router.replace(fb);
    }
  }

  if (config.rootClassName?.trim()) {
    const parts = new Set(config.rootClassName.split(/\s+/).filter(Boolean));
    if (!parts.has("abey")) {
      parts.add("abey");
    }
    if (!parts.has("abey-app")) {
      parts.add("abey-app");
    }
    if (!parts.has("abey-shell-app")) {
      parts.add("abey-shell-app");
    }
    root.className = [...parts].join(" ");
  } else {
    root.className = "abey abey-app abey-shell-app";
  }

  const persistAppearance = config.variant === "admin" ? config.persistAppearance !== false : false;
  const resolvedAppearance: ShellAppearanceMode =
    config.variant === "admin"
      ? getResolvedAdminAppearance({
          preferred: config.appearance ?? "dark",
          persist: persistAppearance,
        })
      : "light";
  root.classList.toggle("abey--dark", resolvedAppearance === "dark");

  const hasHostTheme =
    (config.themeVars && Object.keys(config.themeVars).length > 0) ||
    (config.themeVarsDark && Object.keys(config.themeVarsDark).length > 0) ||
    (config.themeVarsLight && Object.keys(config.themeVarsLight).length > 0);
  const hostThemeBinder = hasHostTheme ? createShellHostThemeBinder(root, config) : null;
  hostThemeBinder?.apply(resolvedAppearance);

  const appearanceToggle: MountAppShellAppearanceToggle | undefined =
    config.variant === "admin" && config.showAppearanceToggle !== false
      ? {
          mode: resolvedAppearance,
          root,
          persist: persistAppearance,
          onAfterAppearanceApply: hostThemeBinder ? (m) => hostThemeBinder.apply(m) : undefined,
        }
      : undefined;

  const startPath = router.getPath();
  const shell = mountAppShell(root, {
    brand: config.brand,
    subBrand: config.subBrand,
    variant: config.variant,
    nav: navList,
    currentPath: startPath,
    onNavigate: (p) => router.navigate(p),
    dashboardLayout: useDashboard,
    logoMark: config.logoMark,
    brandLogoSrc: config.brandLogoSrc,
    brandLogoAlt: config.brandLogoAlt,
    brandTitleSplit: config.brandTitleSplit,
    appBarActions: config.appBarActions,
    appBarActionsAppend: config.appBarActionsAppend,
    appBarInset: config.appBarInset,
    appearanceToggle,
    sidebarMenuMode: config.sidebarMenuMode,
  });
  const outletScrollInstantTop = (): void => {
    const el = shell.outlet;
    el.scrollTop = 0;
    el.scrollLeft = 0;
  };

  const scrollWindowAndDocumentInstantTop = (): void => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
    try {
      const de = document.documentElement;
      de.scrollTop = 0;
      de.scrollLeft = 0;
      const bd = document.body;
      if (bd) {
        bd.scrollTop = 0;
        bd.scrollLeft = 0;
      }
    } catch {
      /* ignore */
    }
  };

  let routeCleanup: (() => void) | void;
  let navSeq = 0;
  /** Pathname ya montado en `outlet` (evita remount brusco al repetir clic o `navigate()` a la misma URL). */
  let outletMountedPath: string | null = null;
  /** Ruta hacia la que hay un montaje en curso (evita doble clic reactivando sidebar/animaciones). */
  let navigatingTo: string | null = null;

  const applyRoute = (rawPath: string): void => {
    const p = normalizePathname(rawPath);

    if (outletMountedPath === p || navigatingTo === p) {
      return;
    }

    shell.setCurrentPath(p);
    navigatingTo = p;

    const mySeq = (navSeq += 1);

    const prefersReduced =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    const transitionOn = config.outletRouteTransition !== false;
    const doAnim = transitionOn && !prefersReduced;

    const run = async (): Promise<void> => {
      const routeMsOut = readOutletRouteDurMs(shell.outlet, "--abey-route-dur-out", 105);
      const routeMsIn = readOutletRouteDurMs(shell.outlet, "--abey-route-dur-in", 145);

      if (doAnim) {
        shell.outlet.classList.add("abey-outlet--leaving");
        await new Promise<void>((res) => window.setTimeout(res, routeMsOut));
        if (mySeq !== navSeq) return;
      }

      // Notify current view to cleanup (used by `mountLifecycle`).
      try {
        shell.outlet.dispatchEvent(new CustomEvent("abey-dispose"));
      } catch {
        /* ignore */
      }
      if (typeof routeCleanup === "function") {
        routeCleanup();
      }
      routeCleanup = undefined;
      shell.outlet.textContent = "";
      outletScrollInstantTop();
      scrollWindowAndDocumentInstantTop();

      const r = matchAppRoute(p, config.routes);
      config.onRouteChange?.(p, r);
      if (r) {
        if (config.appDocumentTitle) {
          document.title = r.title ? `${r.title} · ${config.appDocumentTitle}` : config.appDocumentTitle;
        } else {
          document.title = r.title || p;
        }
      } else {
        const miss = document.createElement("p");
        miss.className = "abey-routed-miss";
        miss.textContent = "Ruta no encontrada.";
        shell.outlet.appendChild(miss);
        if (config.appDocumentTitle) {
          document.title = `404 · ${config.appDocumentTitle}`;
        } else {
          document.title = "No encontrada";
        }
      }
      if (r) {
        routeCleanup = r.mount(shell.outlet) as void | (() => void);
      }

      if (mySeq !== navSeq) {
        return;
      }
      outletMountedPath = p;
      navigatingTo = null;

      if (doAnim) {
        shell.outlet.classList.remove("abey-outlet--leaving");
        shell.outlet.classList.add("abey-outlet--entering");
        await new Promise<void>((res) => window.setTimeout(res, routeMsIn));
        if (mySeq !== navSeq) return;
        shell.outlet.classList.remove("abey-outlet--entering");
      }

      scrollWindowAndDocumentInstantTop();
      if (!prefersReduced && typeof shell.outlet.scrollTo === "function") {
        try {
          shell.outlet.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        } catch {
          outletScrollInstantTop();
        }
      } else {
        outletScrollInstantTop();
      }
    };

    void run();
  };
  const unsub = router.subscribe((p) => applyRoute(p));
  return {
    router,
    outlet: shell.outlet,
    dispose: () => {
      hostThemeBinder?.clear();
      unsub();
      if (typeof routeCleanup === "function") {
        routeCleanup();
      }
      shell.dispose();
      router.dispose();
    },
  };
}
