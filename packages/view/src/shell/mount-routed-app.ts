import { createPathRouter, normalizePathname } from "../router/path-router.js";
import { firstNavPath, matchAppRoute, type AppRoute } from "./app-routes.js";

export type { AppRoute } from "./app-routes.js";

export type ShellVariant = "admin" | "landing" | "blank";

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
   * Mark in the colored stripe (**initials**, etc.). Default **`brand`**.
   */
  logoMark?: string;
  /**
   * Top-right app-bar actions (**notifications**, …). Omit to show three emoji placeholders — assign **`onClick`** to integrate.
   */
  appBarActions?: { ariaLabel: string; icon: string; onClick?: () => void }[];
  rootClassName?: string;
  fallbackPath?: string;
  onRouteChange?: (path: string, route: AppRoute | null) => void;
  appDocumentTitle?: string;
};

export type NavItem = { path: string; label: string; pathNorm: string; icon?: string; iconFa?: string };

/**
 * Builds shell DOM: admin sidebar + **`main.abey-outlet`** or landing top bar (**`blank`** = outlet only).
 * Pair with **`createPathRouter`** manually if you skip **`mountRoutedApp`** orchestration.
 */
function defaultAppBarActions(): { ariaLabel: string; icon: string; onClick?: () => void }[] {
  return [
    { ariaLabel: "Avisos", icon: "🔔" },
    { ariaLabel: "Mensajes", icon: "✉" },
    { ariaLabel: "Cuenta", icon: "👤" },
  ];
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
    appBarActions?: { ariaLabel: string; icon: string; onClick?: () => void }[];
  },
): {
  shellRoot: HTMLElement;
  outlet: HTMLElement;
  setCurrentPath: (path: string) => void;
  dispose: () => void;
} {
  const isDashboard = config.variant === "admin" && config.dashboardLayout !== false;

  const shellRoot = document.createElement("div");
  shellRoot.className = `abey abey-shell abey-shell--${config.variant}`.trim();
  if (isDashboard) {
    shellRoot.classList.add("abey-shell--dashboard");
  }

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
    const mark = document.createElement("div");
    mark.className = "abey-appbar__mark";
    const t = document.createElement("span");
    t.className = "abey-appbar__mark-title";
    t.textContent = (config.logoMark?.trim() ? config.logoMark : config.brand) ?? config.brand;
    mark.appendChild(t);
    if (config.subBrand) {
      const su = document.createElement("span");
      su.className = "abey-appbar__mark-sub";
      su.textContent = config.subBrand;
      mark.appendChild(su);
    }
    const spacer = document.createElement("div");
    spacer.className = "abey-appbar__spacer";
    spacer.setAttribute("aria-hidden", "true");
    const tools = document.createElement("div");
    tools.className = "abey-appbar__tools";
    const actions = (config.appBarActions?.length ? config.appBarActions : null) ?? defaultAppBarActions();
    for (const act of actions) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "abey-appbar__action";
      b.setAttribute("aria-label", act.ariaLabel);
      b.appendChild(document.createTextNode(act.icon));
      b.addEventListener("click", (e) => {
        e.preventDefault();
        act.onClick?.();
      });
      tools.appendChild(b);
    }
    row.appendChild(mark);
    row.appendChild(spacer);
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
  const outlet = document.createElement("main");
  outlet.className = config.variant === "landing" ? "abey-outlet abey-outlet--landing" : "abey-outlet";
  if (isDashboard) {
    outlet.classList.add("abey-outlet--dashboard");
  }
  outlet.setAttribute("id", "abey-outlet");

  if (config.variant === "admin") {
    const aside = document.createElement("aside");
    aside.className = isDashboard ? "abey-sidebar abey-sidebar--dashboard" : "abey-sidebar";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "abey-sidebar__toggle";
    toggle.setAttribute("aria-label", "Menú");
    toggle.setAttribute("aria-controls", "abey-side-nav");
    toggle.appendChild(document.createTextNode("☰"));
    const sNav = document.createElement("nav");
    sNav.id = "abey-side-nav";
    sNav.className = "abey-sidebar__nav";
    sNav.setAttribute("aria-label", "Principal");
    const sideInner = document.createElement("div");
    sideInner.className = "abey-sidebar__inner";
    const sn = document.createElement("div");
    sn.className = "abey-nav-stack";
    fillStackNav(
      sn,
      config.nav,
      config.currentPath,
      config.onNavigate,
      isDashboard,
    );
    sideInner.appendChild(sn);
    sNav.appendChild(toggle);
    sNav.appendChild(sideInner);
    aside.appendChild(sNav);
    body.appendChild(aside);
    onToggle(toggle, aside, sNav);
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

  const setCurrentPath = (p: string): void => {
    const cur = normalizePathname(p);
    for (const el of Array.from(shellRoot.querySelectorAll<HTMLAnchorElement>("[data-abey-path]"))) {
      const raw = el.dataset.abeyPath;
      if (!raw) {
        continue;
      }
      const m = normalizePathname(raw) === cur;
      el.setAttribute("aria-current", m ? "page" : "false");
      el.classList.toggle("abey-nav-link--active", m);
    }
  };

  setCurrentPath(config.currentPath);

  return {
    shellRoot,
    outlet,
    setCurrentPath,
    dispose: () => {
      shellRoot.removeEventListener("click", clickOff);
    },
  };
}

function onToggle(button: HTMLButtonElement, aside: HTMLElement, nav: HTMLElement): void {
  const sync = (open: boolean): void => {
    aside.setAttribute("data-abey-open", open ? "true" : "false");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };
  sync(false);
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = aside.getAttribute("data-abey-open") !== "true";
    sync(open);
  });
  nav.addEventListener("click", (e) => {
    if (e.target instanceof HTMLAnchorElement && e.target.closest("a[href]")) {
      if (window.matchMedia("(max-width: 900px)").matches) {
        sync(false);
      }
    }
  });
}

function fillStackNav(
  el: HTMLElement,
  items: NavItem[],
  current: string,
  onNavigate: (p: string) => void,
  withNavIcons: boolean,
): void {
  const cur = normalizePathname(current);
  for (const it of items) {
    const a = makeNavLink(
      it,
      cur,
      onNavigate,
      "abey-nav-link--sidebar",
      withNavIcons ? { withNavIcons: true } : undefined,
    );
    el.appendChild(a);
  }
}

function fillHorizontalNav(
  el: HTMLElement,
  items: NavItem[],
  current: string,
  onNavigate: (p: string) => void,
): void {
  const cur = normalizePathname(current);
  for (const it of items) {
    const a = makeNavLink(it, cur, onNavigate, "abey-nav-link--horizontal");
    el.appendChild(a);
  }
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
    .map((r) => {
      const pathNorm = r.path.startsWith("/") ? r.path : `/${r.path}`;
      return { path: r.path, pathNorm, label: r.label, icon: r.navIcon, iconFa: r.navIconFa };
    });

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
    appBarActions: config.appBarActions,
  });
  let routeCleanup: (() => void) | void;
  let navSeq = 0;

  const applyRoute = (rawPath: string): void => {
    const mySeq = (navSeq += 1);
    const p = normalizePathname(rawPath);
    shell.setCurrentPath(p);

    const prefersReduced =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    const doAnim = !prefersReduced;

    const run = async (): Promise<void> => {
      if (doAnim) {
        shell.outlet.classList.add("abey-outlet--leaving");
        await new Promise<void>((res) => window.setTimeout(res, 110));
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

      if (doAnim) {
        shell.outlet.classList.remove("abey-outlet--leaving");
        shell.outlet.classList.add("abey-outlet--entering");
        await new Promise<void>((res) => window.setTimeout(res, 140));
        if (mySeq !== navSeq) return;
        shell.outlet.classList.remove("abey-outlet--entering");
      }
    };

    void run();
  };
  const unsub = router.subscribe((p) => applyRoute(p));
  return {
    router,
    outlet: shell.outlet,
    dispose: () => {
      unsub();
      if (typeof routeCleanup === "function") {
        routeCleanup();
      }
      shell.dispose();
      router.dispose();
    },
  };
}
