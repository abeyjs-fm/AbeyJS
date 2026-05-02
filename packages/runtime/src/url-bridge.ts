/**
 * Browser URL ↔ **intent dispatch** helpers. **`startUrlIntentSync`** listens for path changes; **`intentFromQuery`**
 * supports **`?omegaIntent=`** deep links. Unused on SSR when **`window`** is absent.
 */

import type { OmegaFlowManager } from "@abeyjs/flows";
import { intentOf } from "@abeyjs/core";
import type { Intent, IntentType } from "@abeyjs/core";

export interface PathIntentMap {
  /** Path template **without** leading slash, e.g. **`products`** or **`products/new`**. */
  path: string;
  intent: IntentType;
  /** If true, dispatch on popstate as well */
  syncOnPopState?: boolean;
  /** Map URL parts to payload — default payload {} */
  toPayload?: (context: { pathname: string; segments: string[]; search: URLSearchParams }) => unknown;
}

/**
 * Optional: map browser URL updates to/dispatch Intents. Keeps navigation out of
 * the widget tree when using intent-first routing.
 */
export function startUrlIntentSync(maps: PathIntentMap[], flow: OmegaFlowManager, getPath: () => string = () => window.location.pathname): () => void {
  const run = () => {
    const path = getPath().replace(/^\/+|\/+$/g, "");
    const u = new URL(`http://local/${path ? path + "/" : ""}${typeof window !== "undefined" ? window.location.search : ""}`);
    for (const m of maps) {
      const p = m.path.replace(/^\/+|\/+$/g, "");
      if (path === p || path.startsWith(p + "/")) {
        const segments = path.split("/");
        const payload = m.toPayload
          ? m.toPayload({ pathname: path, segments, search: u.searchParams })
          : {};
        void flow.dispatch(intentOf(m.intent, payload), { source: "url-bridge" });
        break;
      }
    }
  };
  if (typeof window === "undefined") {
    return () => {};
  }
  run();
  const onPop = () => {
    for (const m of maps) {
      if (m.syncOnPopState) {
        run();
        return;
      }
    }
  };
  window.addEventListener("popstate", onPop);
  return () => {
    window.removeEventListener("popstate", onPop);
  };
}

/** **`history.pushState`** shim (no reload). Safe no-op server-side. */
export function setPath(path: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.history.pushState(null, "", path);
}

/**
 * Query-string deep link: **`?omegaIntent=IntentName&...`** → **`intentOf`**; extra keys become string payload fields.
 */
export function intentFromQuery(search: string): Intent | null {
  const s = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const t = s.get("omegaIntent");
  if (!t) {
    return null;
  }
  const rest: Record<string, string> = {};
  s.forEach((v, k) => {
    if (k !== "omegaIntent") {
      rest[k] = v;
    }
  });
  return intentOf(t, Object.keys(rest).length ? rest : undefined);
}
