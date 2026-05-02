import type { Unsubscribe } from "@abeyjs/core";

/**
 * Single-slot observable: **`get`** / **`set`** / **`subscribe`** without external state libraries.
 *
 * Equality: **`Object.is`** suppresses emits when the resolved value is unchanged (**`NaN`** handled per spec).
 * For plain objects you must **`set`** a **new** reference (or mutate + force by **`set`** the same-shaped object only if identity changes — prefer immutable updates).
 */
export class StateCell<T> {
  private v: T;
  private readonly subs = new Set<() => void>();

  constructor(initial: T) {
    this.v = initial;
  }

  /** Latest value (not a defensive copy unless **`T`** is copied by caller). */
  get(): T {
    return this.v;
  }

  /**
   * Store **`next`** or **`next(previous)`**. Skips **`emit`** when **`Object.is`** says nothing changed.
   */
  set(next: T | ((prev: T) => T)): void {
    const resolved = typeof next === "function" ? (next as (p: T) => T)(this.v) : next;
    if (Object.is(resolved, this.v)) {
      return;
    }
    this.v = resolved;
    this.emit();
  }

  /** Same as **`set(updater)`** when passing a pure updater callback. */
  update(updater: (prev: T) => T): void {
    this.set(updater);
  }

  /**
   * Runs **`listener`** after each effective **`set`** (sync). Tear down with returned **`Unsubscribe`**.
   */
  subscribe(listener: () => void): Unsubscribe {
    this.subs.add(listener);
    return () => {
      this.subs.delete(listener);
    };
  }

  private emit(): void {
    for (const s of this.subs) {
      s();
    }
  }
}
