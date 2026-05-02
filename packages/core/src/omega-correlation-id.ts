/** Opaque tracing handle carried on events and intents. */
export type CorrelationId = string & { readonly __brand: "CorrelationId" };

/** New correlation id (UUID when `crypto.randomUUID` exists, otherwise a time/random fallback). */
export function createCorrelationId(): CorrelationId {
  return (globalThis.crypto?.randomUUID?.() ?? `corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`) as CorrelationId;
}
