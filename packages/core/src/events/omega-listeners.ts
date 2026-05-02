import type { EventMeta } from "./omega-event-meta.js";

export type Unsubscribe = () => void;

export type EventListener<TPayload> = (payload: TPayload, meta: EventMeta) => void;
