import { createCorrelationId, type CorrelationId } from "../omega-correlation-id.js";
import { omegaNextSequencedId } from "../omega-sequencer.js";
import type { OmegaEventName } from "../semantics/omega-event-name.js";
import type { EventMeta } from "./omega-event-meta.js";
import type { Unsubscribe } from "./omega-listeners.js";

/**
 * Channel notification: `id`, `name`, `payload`, optional `namespace`, `meta`.
 */
export interface OmegaEvent<TName extends string = string, TPayload = unknown> {
  readonly id: string;
  readonly name: TName;
  readonly payload: TPayload;
  readonly namespace?: string | undefined;
  readonly meta: EventMeta;
}

export type WildcardListener = (event: OmegaEvent<string, unknown>) => void;

/** Wildcard stream adapter: `listen` returns an unsubscribe handle. */
export interface OmegaEventStream {
  listen(listener: WildcardListener): Unsubscribe;
}

/** Resolves a string or `{ name }` semantic object to the wire event name string. */
export function wireEventName(eventName: OmegaEventName | string): string {
  return typeof eventName === "string" ? eventName : eventName.name;
}

/**
 * Constructs an `OmegaEvent` with a fresh sequenced `id` unless you pass `init.id`.
 */
export function omegaEventFromName<TPayload>(
  eventName: OmegaEventName | string,
  init?: {
    payload?: TPayload;
    id?: string;
    namespace?: string;
    correlationId?: CorrelationId;
    source?: string;
    timestamp?: number;
  },
): OmegaEvent<string, TPayload | undefined> {
  const name = wireEventName(eventName);
  const correlationId = init?.correlationId ?? createCorrelationId();
  return {
    id: init?.id ?? omegaNextSequencedId("ev:"),
    name,
    payload: init?.payload,
    namespace: init?.namespace,
    meta: {
      correlationId,
      timestamp: init?.timestamp ?? Date.now(),
      source: init?.source,
    },
  };
}
