/**
 * Trim trailing slashes (**`/`** canonical); pairs with **`setPath`** from **`@abeyjs/runtime`** for intent+URL workflows.
 */
export function normalizePathname(p: string): string {
  const t = p.trim() || "/";
  if (t === "/") {
    return "/";
  }
  return t.replace(/\/+$/, "");
}

/** **`pathname`**-centric router (**no hash**): **`navigate`/`replace`** + **`popstate`** fan-out. */
export function createPathRouter(): {
  getPath: () => string;
  /** **`pushState`** + notify subscribers */
  navigate: (path: string) => void;
  /** **`replaceState`** + notify subscribers */
  replace: (path: string) => void;
  subscribe: (cb: (path: string) => void) => () => void;
  dispose: () => void;
} {
  const listeners = new Set<(path: string) => void>();
  let lastPath = "/";

  const getPath = (): string => {
    if (typeof window === "undefined") {
      return "/";
    }
    return normalizePathname(window.location.pathname || "/");
  };

  const emit = (path: string): void => {
    lastPath = path;
    for (const f of listeners) {
      f(path);
    }
  };

  if (typeof window !== "undefined") {
    lastPath = getPath();
  }

  const onPop = (): void => {
    const p = getPath();
    lastPath = p;
    for (const f of listeners) {
      f(p);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("popstate", onPop);
  }

  const setLocation = (path: string, method: "push" | "replace"): void => {
    if (typeof window === "undefined") {
      return;
    }
    const next = path.startsWith("/") ? path : `/${path}`;
    const norm = normalizePathname(next) === "" ? "/" : next;
    if (method === "push") {
      window.history.pushState(null, "", norm);
    } else {
      window.history.replaceState(null, "", norm);
    }
    const p = getPath();
    emit(p);
  };

  return {
    getPath: () => (typeof window === "undefined" ? lastPath : getPath()),
    navigate: (path: string) => setLocation(path, "push"),
    replace: (path: string) => setLocation(path, "replace"),
    subscribe: (cb: (path: string) => void) => {
      cb(typeof window === "undefined" ? lastPath : getPath());
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose: () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("popstate", onPop);
      }
      listeners.clear();
    },
  };
}

/** Return shape of **`createPathRouter`** (alias for typing). */
export type PathRouter = ReturnType<typeof createPathRouter>;
