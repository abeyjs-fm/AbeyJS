import type { CorrelationId } from "../omega-correlation-id.js";
import type { OmegaObject } from "../types/omega-object.js";

/** Wire string carried in `OmegaIntent.name`. */
export type IntentWireName = string;

/** @deprecated Prefer {@link IntentWireName}. */
export type IntentType = IntentWireName;

/**
 * Dispatched action: `id`, `name`, `payload`, optional `namespace`, `meta` (includes `correlationId`).
 */
export interface OmegaIntent extends OmegaObject {
  readonly name: string;
  readonly payload: unknown;
  readonly namespace?: string | undefined;
  readonly meta: { correlationId: CorrelationId } & Record<string, unknown>;
}

/** Historical alias for {@link OmegaIntent}. */
export type Intent = OmegaIntent;
