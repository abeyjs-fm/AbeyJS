export type Unsubscribe = () => void;

export type OmegaReadableSignal<T> = {
  get: () => T;
  subscribe: (listener: (value: T) => void) => Unsubscribe;
};

export type OmegaSignal<T> = OmegaReadableSignal<T> & {
  set: (next: T) => void;
  update: (fn: (prev: T) => T) => void;
};

export type SignalOptions<T> = {
  equals?: (a: T, b: T) => boolean;
};

export function signal<T>(initial: T, opts: SignalOptions<T> = {}): OmegaSignal<T> {
  let value = initial;
  const listeners = new Set<(v: T) => void>();
  const equals = opts.equals ?? Object.is;

  const notify = (): void => {
    for (const l of listeners) l(value);
  };

  return {
    get: () => value,
    set: (next) => {
      if (equals(next, value)) return;
      value = next;
      notify();
    },
    update: (fn) => {
      const next = fn(value);
      if (equals(next, value)) return;
      value = next;
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(value);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function readonlySignal<T>(s: OmegaReadableSignal<T>): OmegaReadableSignal<T> {
  return { get: () => s.get(), subscribe: (l) => s.subscribe(l) };
}

export function computed<T>(compute: () => T, deps: OmegaReadableSignal<unknown>[]): OmegaReadableSignal<T> {
  const out = signal<T>(compute());
  const unsubs = deps.map((d) => d.subscribe(() => out.set(compute())));
  // attach cleanup hook (optional, best-effort)
  const subscribe = out.subscribe;
  let subs = 0;
  return {
    get: out.get,
    subscribe: (l) => {
      subs++;
      const u = subscribe(l);
      return () => {
        u();
        subs--;
        if (subs <= 0) {
          for (const uu of unsubs) uu();
        }
      };
    },
  };
}

export function isSignal(x: unknown): x is OmegaSignal<unknown> {
  if (!x || typeof x !== "object") return false;
  const v = x as Partial<OmegaReadableSignal<unknown>>;
  return typeof v.get === "function" && typeof v.subscribe === "function";
}

