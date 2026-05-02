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

/** Normalizes a host basename like Vite **`import.meta.env.BASE_URL`** (`/repo/` → `/repo`). Empty when none. */
export function normalizeBasename(raw?: string): string {
  if (raw == null) return "";
  let t = String(raw).trim();
  if (t === "" || t === "/" || t === "./") return "";
  while (t.endsWith("/") && t.length > 1) {
    t = t.slice(0, -1);
  }
  return t.startsWith("/") ? t : `/${t}`;
}

/** App-relative path → full browser pathname segment (leading slash URL path). */
export function withBasename(appPath: string, basename: string): string {
  const b = normalizeBasename(basename);
  let ap = appPath.trim() || "/";
  if (!ap.startsWith("/")) ap = `/${ap}`;
  ap = normalizePathname(ap);
  if (ap === "") ap = "/";
  if (!b) return ap;
  if (ap === "/") return `${b}/`;
  return `${b}${ap}`;
}

/** Browser **`location.pathname`** → app route path (routes table / **`matchAppRoute`** shape). */
export function stripBasenameFromPathname(browserPathname: string, basename: string): string {
  const b = normalizeBasename(basename);
  const raw = normalizePathname(browserPathname || "/");
  if (!b) {
    return raw === "" ? "/" : raw;
  }
  if (raw === b) {
    return "/";
  }
  const prefix = `${b}/`;
  if (raw.startsWith(prefix)) {
    const rest = raw.slice(prefix.length);
    const inner = rest === "" ? "/" : `/${rest.replace(/^\/+/, "")}`;
    return normalizePathname(inner);
  }
  return raw === "" ? "/" : raw;
}

export type CreatePathRouterOptions = {
  /**
   * When the app is served under a host subpath (**GitHub Pages** `https://org.github.io/repo/`, **`base`** in Vite),
   * set this to the same string you pass to **`normalizeBasename`** (e.g. **`import.meta.env.BASE_URL`**).
   */
  basename?: string;
};

/** **`pathname`**-centric router (**no hash**): **`navigate`/`replace`** + **`popstate`** fan-out. */
export function createPathRouter(options?: CreatePathRouterOptions): {
  getPath: () => string;
  /** **`pushState`** + notify subscribers */
  navigate: (path: string) => void;
  /** **`replaceState`** + notify subscribers */
  replace: (path: string) => void;
  subscribe: (cb: (path: string) => void) => () => void;
  dispose: () => void;
} {
  const base = normalizeBasename(options?.basename);
  const listeners = new Set<(path: string) => void>();
  let lastPath = "/";

  const getPath = (): string => {
    if (typeof window === "undefined") {
      return "/";
    }
    const full = normalizePathname(window.location.pathname || "/");
    return stripBasenameFromPathname(full, base);
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
    const browserPath = withBasename(norm, base);
    if (method === "push") {
      window.history.pushState(null, "", browserPath);
    } else {
      window.history.replaceState(null, "", browserPath);
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
