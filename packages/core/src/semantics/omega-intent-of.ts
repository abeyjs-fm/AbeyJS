import { createCorrelationId, type CorrelationId } from "../omega-correlation-id.js";
import { omegaNextSequencedId } from "../omega-sequencer.js";
import type { OmegaIntent } from "./omega-intent.js";

/**
 * Builds an {@link OmegaIntent} with a sequenced `id` and default {@link createCorrelationId} unless overridden.
 */
export function intentOf(
  name: string,
  payload: unknown,
  options?: { correlationId?: CorrelationId; id?: string; namespace?: string },
): OmegaIntent {
  const id = options?.id ?? omegaNextSequencedId("intent:");
  const correlationId = options?.correlationId ?? createCorrelationId();
  return {
    id,
    meta: { correlationId },
    name,
    payload,
    namespace: options?.namespace,
  };
}

/** Layered intent handler: receives typed `payload` and an application-defined `ctx`. */
export type IntentHandler<TPayload, TContext> = (payload: TPayload, ctx: TContext) => void | Promise<void>;
