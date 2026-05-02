import type { AppRoute } from "../shell/app-routes.js";

export type ComponentRouteNav = Omit<AppRoute, "mount" | "path">;

export type ComponentRouteSpec = {
  selector: string;
  /**
   * Optional lazy import to ensure the custom element is registered
   * before mounting (recommended when the component lives in a split chunk).
   */
  load?: () => Promise<unknown>;
  /**
   * When `load` is set, set to `true` to show a short “Cargando…” line in the outlet until the chunk resolves.
   * Default keeps the outlet empty (avoids placeholder flash; brief blank is possible).
   * @default false
   */
  showLoading?: boolean;
  /** Attributes to set on the created element (e.g. `{ runtimepath: "__abeyRuntime" }`). */
  attrs?: Record<string, string>;
};

/**
 * AppRoute helper: mounts a Web Component selector without `innerHTML`.
 *
 * It does a minimal mount:
 * - optionally awaits `load()`
 * - `outlet.replaceChildren(document.createElement(selector))`
 */
export function componentRoute(path: string, nav: ComponentRouteNav, spec: ComponentRouteSpec): AppRoute {
  const selector = String(spec.selector ?? "").trim();
  if (!selector) {
    throw new Error("[componentRoute] spec.selector es requerido.");
  }
  return {
    ...nav,
    path,
    mount: (outlet) => {
      const attrs = spec.attrs ?? {};

      if (!spec.load) {
        const el = document.createElement(selector);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
        outlet.replaceChildren(el);
        return;
      }

      outlet.replaceChildren();
      if (spec.showLoading === true) {
        const loading = document.createElement("p");
        loading.className = "abey-starter-footnote";
        loading.setAttribute("role", "status");
        loading.textContent = "";//TODO: add loading text
        outlet.appendChild(loading);
      }

      void spec
        .load()
        .then(() => {
          const el = document.createElement(selector);
          for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
          outlet.replaceChildren(el);
        })
        .catch((err: unknown) => {
          outlet.textContent = "";
          const p = document.createElement("p");
          p.setAttribute("role", "alert");
          p.className = "abey-starter-footnote";
          p.textContent = err instanceof Error ? err.message : "Error al cargar el componente.";
          outlet.appendChild(p);
        });
    },
  };
}

