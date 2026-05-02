/** DI key: string label or **`Symbol.for`** marker from **`omegaToken`**. */
export type OmegaToken = string | symbol;

type Provider<T> =
  | { kind: "value"; value: T }
  | { kind: "factory"; factory: () => T; cached: boolean; value?: T };

/**
 * Helper to create stable-ish tokens without boilerplate.
 * Uses `Symbol.for` so the same name yields the same symbol within a JS realm.
 */
export function omegaToken(name: string): symbol {
  const n = name.trim();
  if (!n) {
    throw new Error("omegaToken: name is required.");
  }
  return Symbol.for(`abeyjs:${n}`);
}

/**
 * Minimal service locator on **`OmegaRuntime.di`**:
 * - **`provide`** — eager value
 * - **`provideFactory`** — lazy singleton (first **`get`** memoizes **`factory`** result)
 */
export class OmegaContainer {
  private readonly providers = new Map<OmegaToken, Provider<unknown>>();

  provide<T>(token: OmegaToken, value: T): void {
    this.providers.set(token, { kind: "value", value });
  }

  provideFactory<T>(token: OmegaToken, factory: () => T): void {
    this.providers.set(token, { kind: "factory", factory, cached: false });
  }

  has(token: OmegaToken): boolean {
    return this.providers.has(token);
  }

  tryGet<T>(token: OmegaToken): T | undefined {
    const p = this.providers.get(token) as Provider<T> | undefined;
    if (!p) {
      return undefined;
    }
    if (p.kind === "value") {
      return p.value;
    }
    if (p.cached) {
      return p.value as T;
    }
    const v = p.factory();
    p.value = v;
    p.cached = true;
    return v;
  }

  get<T>(token: OmegaToken): T {
    const v = this.tryGet<T>(token);
    if (v === undefined) {
      const name = typeof token === "symbol" ? token.description ?? "(symbol)" : token;
      throw new Error(`OmegaContainer: missing provider for token "${name}".`);
    }
    return v;
  }
}

