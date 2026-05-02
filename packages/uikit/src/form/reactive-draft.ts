/**
 * Draft reactivo para formularios imperativos: store + lenses + bindings DOM.
 * Casos típicos: tablas/editor embebidos, binds custom, undo/redo local.
 * Para formularios estándar preferí `<abey-form>` + `AbeyFormConfig` + Zod.
 */
export type Unsubscribe = () => void;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;
export type FieldFlags<T> = Partial<Record<keyof T, boolean>>;

export type FormSnapshot<T> = {
  value: T;
  dirty: FieldFlags<T>;
  touched: FieldFlags<T>;
};

function shallowClone<T extends Record<string, unknown>>(obj: T): T {
  return { ...(obj as any) };
}

function cloneSnapshot<T extends Record<string, unknown>>(snap: FormSnapshot<T>): FormSnapshot<T> {
  return {
    value: shallowClone(snap.value),
    dirty: shallowClone(snap.dirty as any),
    touched: shallowClone(snap.touched as any),
  };
}

export class FormStore<T extends Record<string, unknown>> {
  #value: T;
  #dirty: FieldFlags<T> = {};
  #touched: FieldFlags<T> = {};
  #errors: FieldErrors<T> = {};
  #pending: FieldFlags<T> = {};

  #subs = new Set<() => void>();
  #txDepth = 0;
  #txChanged = false;

  #undo: FormSnapshot<T>[] = [];
  #redo: FormSnapshot<T>[] = [];
  #historyLimit: number;

  constructor(initial: T, opts?: { historyLimit?: number }) {
    this.#value = shallowClone(initial);
    this.#historyLimit = Math.max(0, opts?.historyLimit ?? 50);
  }

  subscribe(fn: () => void): Unsubscribe {
    this.#subs.add(fn);
    return () => this.#subs.delete(fn);
  }

  notify(): void {
    if (this.#txDepth > 0) {
      this.#txChanged = true;
      return;
    }
    for (const fn of this.#subs) fn();
  }

  tx(fn: () => void): void {
    this.#txDepth++;
    try {
      fn();
    } finally {
      this.#txDepth--;
      if (this.#txDepth === 0 && this.#txChanged) {
        this.#txChanged = false;
        this.notify();
      }
    }
  }

  get value(): T {
    return this.#value;
  }
  get dirty(): FieldFlags<T> {
    return this.#dirty;
  }
  get touched(): FieldFlags<T> {
    return this.#touched;
  }
  get errors(): FieldErrors<T> {
    return this.#errors;
  }
  get pending(): FieldFlags<T> {
    return this.#pending;
  }

  get canUndo(): boolean {
    return this.#undo.length > 0;
  }
  get canRedo(): boolean {
    return this.#redo.length > 0;
  }

  snapshot(): FormSnapshot<T> {
    return {
      value: shallowClone(this.#value),
      dirty: shallowClone(this.#dirty as any),
      touched: shallowClone(this.#touched as any),
    };
  }

  #pushUndo(prev: FormSnapshot<T>): void {
    if (this.#historyLimit <= 0) return;
    this.#undo.push(cloneSnapshot(prev));
    if (this.#undo.length > this.#historyLimit) this.#undo.shift();
    this.#redo = [];
  }

  undo(): void {
    const prev = this.#undo.pop();
    if (!prev) return;
    const cur = this.snapshot();
    this.#redo.push(cur);
    this.#value = shallowClone(prev.value);
    this.#dirty = shallowClone(prev.dirty as any);
    this.#touched = shallowClone(prev.touched as any);
    this.notify();
  }

  redo(): void {
    const next = this.#redo.pop();
    if (!next) return;
    const cur = this.snapshot();
    this.#undo.push(cur);
    this.#value = shallowClone(next.value);
    this.#dirty = shallowClone(next.dirty as any);
    this.#touched = shallowClone(next.touched as any);
    this.notify();
  }

  setAll(next: T, opts?: { resetFlags?: boolean; recordHistory?: boolean }): void {
    const recordHistory = opts?.recordHistory ?? true;
    const resetFlags = opts?.resetFlags ?? false;
    const prev = this.snapshot();

    this.#value = shallowClone(next);
    if (resetFlags) {
      this.#dirty = {};
      this.#touched = {};
      this.#errors = {};
      this.#pending = {};
      this.#undo = [];
      this.#redo = [];
    }
    if (recordHistory) this.#pushUndo(prev);
    this.notify();
  }

  set<K extends keyof T>(key: K, v: T[K], opts?: { recordHistory?: boolean }): void {
    const prev = this.snapshot();
    const recordHistory = opts?.recordHistory ?? true;

    (this.#value as any)[key] = v;
    (this.#dirty as any)[key] = true;
    if (recordHistory) this.#pushUndo(prev);
    this.notify();
  }

  markTouched<K extends keyof T>(key: K): void {
    (this.#touched as any)[key] = true;
    this.notify();
  }

  setErrors(next: FieldErrors<T>): void {
    this.#errors = shallowClone(next as any);
    this.notify();
  }

  setFieldError<K extends keyof T>(key: K, message: string): void {
    (this.#errors as any)[key] = message;
    this.notify();
  }

  clearFieldError<K extends keyof T>(key: K): void {
    if (!Object.prototype.hasOwnProperty.call(this.#errors, key)) return;
    const next = shallowClone(this.#errors as any);
    delete (next as any)[key];
    this.#errors = next;
    this.notify();
  }

  setPending<K extends keyof T>(key: K, isPending: boolean): void {
    if (isPending) {
      (this.#pending as any)[key] = true;
    } else {
      if (Object.prototype.hasOwnProperty.call(this.#pending, key)) {
        const next = shallowClone(this.#pending as any);
        delete (next as any)[key];
        this.#pending = next;
      }
    }
    this.notify();
  }
}

export type Lens<T extends Record<string, unknown>, K extends keyof T> = {
  key: K;
  get(): T[K];
  set(v: T[K]): void;
  markTouched(): void;
  get error(): string;
  get isPending(): boolean;
};

export function lens<T extends Record<string, unknown>, K extends keyof T>(store: FormStore<T>, key: K): Lens<T, K> {
  return {
    key,
    get: () => store.value[key],
    set: (v) => store.set(key, v),
    markTouched: () => store.markTouched(key),
    get error() {
      return String((store.errors as any)?.[key] ?? "");
    },
    get isPending() {
      return Boolean((store.pending as any)?.[key]);
    },
  };
}

export type BindOptions<T> = {
  /** Escribe al DOM solo si el usuario no está editando activamente. */
  respectActiveElement?: boolean;
  coerce?: (raw: string) => T;
  toDom?: (v: T) => string;
};

export function bindTextInput<T>(
  input: HTMLInputElement,
  l: Lens<Record<string, unknown>, any>,
  store: FormStore<any>,
  opts?: BindOptions<T>,
): Unsubscribe {
  const coerce = (opts?.coerce ?? ((raw: string) => raw as any)) as (raw: string) => T;
  const toDom = (opts?.toDom ?? ((v: T) => String(v ?? ""))) as (v: T) => string;
  const respect = opts?.respectActiveElement ?? true;

  const syncToDom = (): void => {
    if (respect && document.activeElement === input) return;
    const v = l.get() as T;
    const next = toDom(v);
    if (input.value !== next) input.value = next;
  };

  const onInput = (): void => {
    store.tx(() => {
      l.set(coerce(input.value) as any);
      store.clearFieldError(l.key as any);
    });
  };
  const onBlur = (): void => l.markTouched();

  input.addEventListener("input", onInput);
  input.addEventListener("blur", onBlur);

  syncToDom();
  const unsub = store.subscribe(syncToDom);
  return () => {
    unsub();
    input.removeEventListener("input", onInput);
    input.removeEventListener("blur", onBlur);
  };
}

export function bindNumberInput(
  input: HTMLInputElement,
  l: Lens<Record<string, unknown>, any>,
  store: FormStore<any>,
  opts?: { respectActiveElement?: boolean },
): Unsubscribe {
  return bindTextInput<number>(
    input,
    l,
    store,
    {
      respectActiveElement: opts?.respectActiveElement,
      coerce: (raw: string) => {
        const n = raw.trim() === "" ? 0 : Number(raw);
        return Number.isFinite(n) ? n : 0;
      },
      toDom: (v: number) => (v === undefined || v === null ? "" : String(v)),
    } as any,
  );
}

export type AsyncValidator<T> = (value: T) => Promise<string | null>;

export type AttachAsyncValidatorOpts = {
  debounceMs?: number;
  /**
   * Debe devolver algo JSON-serializable y estable cuando no cambien tus deps externas.
   * Si cambia (p. ej. lista remota revisada contra el mismo email), se revalida sin `rerun()` manual.
   */
  deps?: () => unknown;
};

/** Retorno de `attachAsyncValidator`: callable para dispose + `rerun` si necesitás forzar corrida igualando deps en el medio. */
export type AsyncValidatorHandle = Unsubscribe & { rerun(): void };

function depsSnapshot(serializer: AttachAsyncValidatorOpts["deps"]): string {
  if (!serializer) return "";
  try {
    return JSON.stringify(serializer());
  } catch {
    return `fallback:${Math.random()}`;
  }
}

export function attachAsyncValidator<T extends Record<string, unknown>, K extends keyof T>(
  store: FormStore<T>,
  key: K,
  validate: AsyncValidator<T[K]>,
  opts?: AttachAsyncValidatorOpts,
): AsyncValidatorHandle {
  const debounceMs = Math.max(0, opts?.debounceMs ?? 250);
  const hasDepsSerializer = typeof opts?.deps === "function";
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** Id de la corrida asíncrona vigente al terminar el debounce (invalida awaited anteriores). */
  let activeRun = 0;
  /**
   * Tras aplicar resultado, cualquier notify por setPending/err ignora reschedule si el valor del campo igual.
   * Evita bucle flicker “Validando…”.
   */
  let hasCommittedBaseline = false;
  let lastCommittedAtApply!: T[K];
  /** Último snapshot de `deps` ya “comprometido” con el último resultado async. */
  let lastCommittedDepsSnap = "";

  const schedule = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void (async () => {
        const runId = ++activeRun;

        store.tx(() => store.setPending(key, true));

        let msg: string | null = null;
        try {
          const v = store.value[key];
          msg = await validate(v);
        } catch {
          msg = null;
        }

        // Solo la corrida más reciente puede tocar errores/pending (evita carreras y pending colgado).
        store.tx(() => {
          if (runId !== activeRun) return;
          store.setPending(key, false);
          if (msg) store.setFieldError(key, msg);
          else store.clearFieldError(key);
          hasCommittedBaseline = true;
          lastCommittedAtApply = store.value[key];
          if (hasDepsSerializer) lastCommittedDepsSnap = depsSnapshot(opts!.deps);
        });
      })();
    }, debounceMs);
  };

  const onNotify = (): void => {
    const cur = store.value[key];
    const depNow = hasDepsSerializer ? depsSnapshot(opts!.deps) : "";
    const depsDrift = hasDepsSerializer && depNow !== lastCommittedDepsSnap;
    if (!depsDrift && hasCommittedBaseline && Object.is(cur, lastCommittedAtApply)) {
      return;
    }
    schedule();
  };

  const rerun = (): void => {
    schedule();
  };

  const unsub = store.subscribe(onNotify);
  onNotify();

  const dispose: AsyncValidatorHandle = Object.assign(() => {
    unsub();
    if (timer !== null) clearTimeout(timer);
  }, {
    rerun,
  });

  return dispose;
}
