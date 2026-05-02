import type { AppRoute, AppRouteNavChild } from "./shell/app-routes.js";

/**
 * Declarative “hero” / info screen: built with **`textContent`** / safe DOM APIs — **no** implicit **`innerHTML`**.
 * For HTML strings use **`setSanitizedHtml`** + **`AbeyJs.sanitize`** (**`docs/security-abeyjs.md`**).
 */
export type PageViewSpec = {
  /** Título principal (h1). */
  heading: string;
  /** Párrafo introductorio. */
  lead?: string;
  /** Lista corta bajo un bloque tipo “card”. */
  bullets?: string[];
  /** Título opcional del bloque card (si hay bullets o acción). */
  cardTitle?: string;
  /** Texto auxiliar al pie (p. ej. truco o link manual en otro paso). */
  footnote?: string;
  /** Botón principal; `onClick` solo si el usuario lo añade (no requiere framework de eventos). */
  primaryAction?: { label: string; onClick?: () => void };
  /** Añade una clase al contenedor raíz (p. ej. `abey--mi-marca` si redefiniste variables en tema). */
  className?: string;
};

/**
 * Materialize **`PageViewSpec`** (**data → DOM**). Use **`appendChild`** or **`AppRoute.mount`**.
 */
export function createPageViewElement(spec: PageViewSpec): HTMLElement {
  const root = document.createElement("div");
  if (spec.className) {
    for (const c of spec.className.split(/\s+/).filter(Boolean)) {
      root.classList.add(c);
    }
  }
  root.classList.add("abey-page-hero");
  const h1 = document.createElement("h1");
  h1.textContent = spec.heading;
  root.appendChild(h1);
  if (spec.lead) {
    const p = document.createElement("p");
    p.textContent = spec.lead;
    root.appendChild(p);
  }
  if ((spec.bullets?.length ?? 0) > 0 || spec.cardTitle || spec.primaryAction) {
    const card = document.createElement("div");
    card.className = "abey-starter-card";
    if (spec.cardTitle) {
      const t = document.createElement("h2");
      t.className = "abey-starter-card__title";
      t.textContent = spec.cardTitle;
      card.appendChild(t);
    }
    if (spec.bullets?.length) {
      const ul = document.createElement("ul");
      for (const line of spec.bullets) {
        const li = document.createElement("li");
        li.textContent = line;
        ul.appendChild(li);
      }
      card.appendChild(ul);
    }
    if (spec.primaryAction) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "abey-btn abey-btn--primary";
      btn.textContent = spec.primaryAction.label;
      if (spec.primaryAction.onClick) {
        btn.addEventListener("click", () => spec.primaryAction?.onClick?.());
      }
      card.appendChild(btn);
    }
    root.appendChild(card);
  }
  if (spec.footnote) {
    const fn = document.createElement("p");
    fn.className = "abey-starter-footnote";
    fn.textContent = spec.footnote;
    root.appendChild(fn);
  }
  return root;
}

/**
 * Outlet **mount** thunk: clears host and appends **`createPageViewElement(spec)`**.
 */
export function buildPageView(spec: PageViewSpec): (outlet: HTMLElement) => void {
  return (outlet) => {
    outlet.textContent = "";
    outlet.appendChild(createPageViewElement(spec));
  };
}

/** Nav metadata passed to **`pageRoute`** (mirrors **`AppRoute`** fields except **`path`** / **`mount`**). */
export type PageRouteNav = {
  label: string;
  title: string;
  showInNav?: boolean;
  navIcon?: string;
  navIconFa?: string;
  /** Mismo contrato que en **`AppRoute`**: solo sidebar admin; cada hoja debe tener su propia entrada en **`getRoutes()`**. */
  navChildren?: AppRouteNavChild[];
};

/**
 * **`AppRoute` factory**: nav metadata + **`buildPageView(spec)`** mount. Prefer raw **`mount`** when wiring custom compositions (**`mountListViewSync`**, …).
 */
export function pageRoute(path: string, nav: PageRouteNav, spec: PageViewSpec): AppRoute {
  const r: AppRoute = {
    path,
    label: nav.label,
    title: nav.title,
    mount: buildPageView(spec),
  };
  if (nav.showInNav !== undefined) {
    r.showInNav = nav.showInNav;
  }
  if (nav.navIcon !== undefined) {
    r.navIcon = nav.navIcon;
  }
  if (nav.navIconFa !== undefined) {
    r.navIconFa = nav.navIconFa;
  }
  if (nav.navChildren !== undefined) {
    r.navChildren = nav.navChildren;
  }
  return r;
}
