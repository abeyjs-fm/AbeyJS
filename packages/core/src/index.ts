/**
 * AbeyJs primitives: channel, events, semantics, lightweight types (`omega-object`, `omega-failure`),
 * and root helpers `omega-sequencer.ts`, `omega-correlation-id.ts`.
 */
export {
  createChannel,
  OmegaChannel,
  OmegaChannelNamespace,
  type OmegaChannelOptions,
  type OmegaEventBus,
} from "./channel/omega-channel.js";
export type { OmegaEvent, OmegaEventStream, WildcardListener } from "./events/omega-event.js";
export { omegaEventFromName, wireEventName } from "./events/omega-event.js";
export type { EventMeta } from "./events/omega-event-meta.js";
export type { EventListener, Unsubscribe } from "./events/omega-listeners.js";

export type { OmegaObject } from "./types/omega-object.js";
export { OmegaFailure } from "./types/omega-failure.js";

export { createCorrelationId, type CorrelationId } from "./omega-correlation-id.js";

export { omegaWireNameFromCamelCaseEnumMember } from "./semantics/omega-semantics-wire-from-camel.js";
export type { OmegaIntentName } from "./semantics/omega-intent-name.js";
export { omegaIntentNameDottedCamel, omegaIntentNameEnumWire } from "./semantics/omega-intent-name.js";
export type { OmegaEventName } from "./semantics/omega-event-name.js";
export { omegaEventNameDottedCamel, omegaEventNameEnumWire } from "./semantics/omega-event-name.js";
export type { OmegaAgentId } from "./semantics/omega-agent-id.js";
export { omegaAgentId, omegaAgentIdEnumWire } from "./semantics/omega-agent-id.js";
export type { OmegaFlowId } from "./semantics/omega-flow-id.js";
export { omegaFlowId, omegaFlowIdEnumWire } from "./semantics/omega-flow-id.js";
export type { OmegaTypedIntent } from "./semantics/omega-typed-intent.js";
export type { OmegaTypedEvent } from "./semantics/omega-typed-event.js";
export type { Intent, IntentType, IntentWireName, OmegaIntent } from "./semantics/omega-intent.js";
export { intentOf, type IntentHandler } from "./semantics/omega-intent-of.js";

export { omegaNextSequencedId } from "./omega-sequencer.js";
