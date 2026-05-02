/**
 * Encadena `<form>` nativo ↔ `FormStore` sin duplicar flush/bind por pantalla.
 * Para formularios generados declarativamente seguí usando `<abey-form>` + Zod.
 */
import {
  attachAsyncValidator,
  bindNumberInput,
  bindTextInput,
  lens,
  type AttachAsyncValidatorOpts,
  type AsyncValidator,
  type AsyncValidatorHandle,
  type FormStore,
  type Unsubscribe,
} from "./reactive-draft.js";

export type NativeDraftFieldKind = "text" | "trimStart" | "number";

export type NativeDraftFieldSpec = {
  /** `HTMLFormElement.elements.namedItem(name)` — coincide con submit / FormData. */
  name: string;
  kind: NativeDraftFieldKind;
};

export type WireNativeFormDraftOptions<T extends Record<string, unknown>> = {
  /** Contenedor donde vive el form (custom element raíz). */
  root: Element;
  /** CSS selector relativamente a root; default útil para demos: `[data-role="…"]`. */
  formSelector: string;
  store: FormStore<T>;
  /** Un entry por campo del modelo que tenga `<input name=…>` en ese form. */
  fields: { [K in keyof T]?: NativeDraftFieldSpec };
  /** Ej. espía errores/pending/`canUndo` hacia estado de vista. */
  onStoreNotify?: () => void;
  asyncValidators?: {
    [K in keyof T]?: {
      validate: AsyncValidator<T[K]>;
      debounceMs?: number;
      deps?: AttachAsyncValidatorOpts["deps"];
    };
  };
};

export type WiredNativeDraftHandle = {
  dispose: () => void;
  /** Llama antes de validate/commit; acepta el `SubmitEvent` para tomar `event.target`. */
  flush(evOrForm?: SubmitEvent | HTMLFormElement | null): void;
  /** Form encontrado el día del wire (null si no existía el selector). */
  getForm(): HTMLFormElement | null;
};

function pickNamedInput(form: HTMLFormElement, name: string): HTMLInputElement | null {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement ? el : null;
}

function resolveForm(
  root: Element,
  formSelector: string,
  hint?: SubmitEvent | HTMLFormElement | null,
): HTMLFormElement | null {
  if (hint instanceof HTMLFormElement) return root.contains(hint) ? hint : null;
  if (hint instanceof Event && hint.target instanceof HTMLFormElement && root.contains(hint.target))
    return hint.target;
  return (root.querySelector(formSelector) as HTMLFormElement | null) ?? null;
}

/** Coerciones alineadas con `bindTextInput` / `bindNumberInput`. */
export function flushNativeDraftField<T extends Record<string, unknown>>(
  store: FormStore<T>,
  key: keyof T,
  input: HTMLInputElement,
  kind: NativeDraftFieldKind,
  opts?: { recordHistory?: boolean },
): void {
  const hist = opts?.recordHistory ?? false;
  const raw = input.value ?? "";
  const recordOpts = hist ? {} : ({ recordHistory: false } as const);
  if (kind === "number") {
    const t = raw.trim();
    const parsed = t === "" ? NaN : Number(t);
    const n = Number.isFinite(parsed) ? parsed : 0;
    store.set(key, n as T[keyof T], recordOpts as any);
    return;
  }
  if (kind === "trimStart") {
    store.set(key, raw.trimStart() as T[keyof T], recordOpts as any);
    return;
  }
  store.set(key, raw.trim() as T[keyof T], recordOpts as any);
}

/**
 * Una sola función: encuentra inputs por `name`, bindea lenses, opcional validators async (+ `deps`), `flush()` para submit.
 */
export function wireNativeFormDraft<T extends Record<string, unknown>>(o: WireNativeFormDraftOptions<T>): WiredNativeDraftHandle {
  const form = resolveForm(o.root, o.formSelector, null);
  const unsubs: Unsubscribe[] = [];
  let asyncHandles: AsyncValidatorHandle[] = [];

  const dispose = (): void => {
    for (const h of asyncHandles) h();
    asyncHandles = [];
    for (const u of unsubs) u();
    unsubs.length = 0;
  };

  if (!form) {
    return {
      dispose,
      flush: (): void => {
        /* no-op */
      },
      getForm: () => null,
    };
  }

  const pairs = (
    Object.entries(o.fields as Record<string, NativeDraftFieldSpec>).filter(([_, spec]) => spec != null) as Array<
      [string, NativeDraftFieldSpec]
    >
  ).map(([k, spec]) => [k as keyof T, spec] as const);

  for (const [key, spec] of pairs) {
    const input = pickNamedInput(form, spec.name);
    if (!input) continue;
    const l = lens(o.store as FormStore<any>, key as any);

    if (spec.kind === "number") {
      unsubs.push(bindNumberInput(input, l, o.store as FormStore<any>));
    } else if (spec.kind === "trimStart") {
      unsubs.push(
        bindTextInput<string>(input, l, o.store as FormStore<any>, {
          coerce: (raw: string) => raw.trimStart(),
        }),
      );
    } else {
      unsubs.push(
        bindTextInput<string>(input, l, o.store as FormStore<any>, {
          coerce: (raw: string) => raw.trim(),
        }),
      );
    }
  }

  if (typeof o.onStoreNotify === "function") {
    unsubs.push(o.store.subscribe(o.onStoreNotify));
    try {
      o.onStoreNotify();
    } catch {
      /* */
    }
  }

  const av = o.asyncValidators;
  if (av) {
    asyncHandles = (Object.entries(av).filter(([_, v]) => v != null) as Array<[keyof T, NonNullable<(typeof av)[keyof T]>]>).map(
      ([fieldKey, spec]) =>
        attachAsyncValidator(o.store, fieldKey, spec.validate as AsyncValidator<any>, {
          debounceMs: spec.debounceMs,
          deps: spec.deps,
        }),
    );
  }

  return {
    dispose,
    flush: (evOrForm?: SubmitEvent | HTMLFormElement | null): void => {
      const f = resolveForm(o.root, o.formSelector, evOrForm ?? null);
      if (!f) return;
      o.store.tx(() => {
        for (const [key, spec] of pairs) {
          const input = pickNamedInput(f, spec.name);
          if (!input) continue;
          flushNativeDraftField(o.store, key, input, spec.kind, { recordHistory: false });
        }
      });
    },
    getForm: () => (resolveForm(o.root, o.formSelector, null) as HTMLFormElement | null),
  };
}
