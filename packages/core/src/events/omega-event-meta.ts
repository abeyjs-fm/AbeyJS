import type { CorrelationId } from "../omega-correlation-id.js";

/** Metadata on every channel event (TS bus). */
export interface EventMeta {
  correlationId: CorrelationId;
  timestamp: number;
  source?: string;
}
