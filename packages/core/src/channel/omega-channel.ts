import type { OmegaEvent, OmegaEventStream, WildcardListener } from "../events/omega-event.js";
import { omegaEventFromName } from "../events/omega-event.js";
import type { EventMeta } from "../events/omega-event-meta.js";
import type { EventListener, Unsubscribe } from "../events/omega-listeners.js";
import type { OmegaTypedEvent } from "../semantics/omega-typed-event.js";
import { createCorrelationId, type CorrelationId } from "../omega-correlation-id.js";

/**
 * Narrow bus contract: emit typed envelopes and expose `events.listen`.
 */
export interface OmegaEventBus {
  emit(event: OmegaEvent<string, unknown>): void;
  emitTyped(event: OmegaTypedEvent): void;
  get events(): OmegaEventStream;
}

export type OmegaChannelOptions = {
  /** Optional hook: disposed channel emit attempts, or listener exceptions (keep the bus from failing silently). */
  onEmitError?: (error: unknown, stackTrace?: string) => void;
};

/**
 * Application event bus: `emit` / `emitTyped` / `events.listen`, namespaced views, `dispose`.
 * `publish` builds an `OmegaEvent` (id + meta) then calls `emit`.
 */
export class OmegaChannel implements OmegaEventBus {
  private readonly byName = new Map<string, Set<EventListener<unknown>>>();
  private readonly allEvents = new Set<WildcardListener>();
  private _disposed = false;
  private readonly onEmitError?: (error: unknown, stackTrace?: string) => void;

  constructor(options?: OmegaChannelOptions) {
    this.onEmitError = options?.onEmitError;
  }

  get events(): OmegaEventStream {
    return {
      listen: (listener: WildcardListener) => this.onAll(listener),
    };
  }

  emit(event: OmegaEvent<string, unknown>): void {
    if (this._disposed) {
      this.onEmitError?.(new Error("OmegaChannel is disposed, cannot emit"), undefined);
      return;
    }
    try {
      const set = this.byName.get(event.name);
      if (set) {
        for (const d of set) {
          (d as EventListener<unknown>)(event.payload, event.meta);
        }
      }
      for (const w of this.allEvents) {
        w(event);
      }
    } catch (e) {
      this.onEmitError?.(e, e instanceof Error ? e.stack : undefined);
    }
  }

  emitTyped(event: OmegaTypedEvent): void {
    const ev = omegaEventFromName(event.name, { payload: event as unknown });
    this.emit(ev);
  }

  /**
   * Convenience: compose `omegaEventFromName(...)` semantics and dispatch in one step.
   * Use `emit` directly when you already hold a finished `OmegaEvent`.
   */
  publish<TName extends string, TPayload>(
    name: TName,
    payload: TPayload,
    meta: Partial<EventMeta> & { namespace?: string } = {},
  ): CorrelationId {
    if (this._disposed) {
      this.onEmitError?.(new Error("OmegaChannel is disposed, cannot publish"), undefined);
      return createCorrelationId();
    }
    const { namespace, correlationId, source, timestamp } = meta;
    const ev = omegaEventFromName(name, {
      payload,
      namespace,
      correlationId,
      source,
      timestamp,
    });
    this.emit(ev);
    return ev.meta.correlationId;
  }

  namespace(name: string): OmegaChannelNamespace {
    return new OmegaChannelNamespace(this, name);
  }

  on<TPayload>(name: string, fn: EventListener<TPayload>): Unsubscribe {
    const set = this.byName.get(name) ?? new Set();
    this.byName.set(name, set);
    const wrapped: EventListener<unknown> = (data, meta) => {
      (fn as EventListener<TPayload>)(data as TPayload, meta);
    };
    set.add(wrapped);
    return () => {
      set.delete(wrapped);
      if (set.size === 0) {
        this.byName.delete(name);
      }
    };
  }

  onAll(fn: WildcardListener): Unsubscribe {
    this.allEvents.add(fn);
    return () => {
      this.allEvents.delete(fn);
    };
  }

  dispose(): void {
    this._disposed = true;
    this.byName.clear();
    this.allEvents.clear();
  }
}

/**
 * Scoped channel: outgoing emits carry this `namespace`.
 * Listeners here receive events tagged for this scope, or events with no `namespace` set.
 */
export class OmegaChannelNamespace implements OmegaEventBus {
  readonly channel: OmegaChannel;
  readonly namespace: string;

  constructor(channel: OmegaChannel, namespace: string) {
    this.channel = channel;
    this.namespace = namespace;
  }

  get events(): OmegaEventStream {
    const ch = this.channel;
    const ns = this.namespace;
    return {
      listen: (listener: WildcardListener) =>
        ch.events.listen((ev) => {
          const evNs = ev.namespace;
          if (evNs != null && evNs !== ns) {
            return;
          }
          listener(ev);
        }),
    };
  }

  emit(event: OmegaEvent<string, unknown>): void {
    const tagged: OmegaEvent<string, unknown> = {
      id: event.id,
      name: event.name,
      payload: event.payload,
      meta: event.meta,
      namespace: this.namespace,
    };
    this.channel.emit(tagged);
  }

  emitTyped(event: OmegaTypedEvent): void {
    const inner = omegaEventFromName(event.name, { payload: event as unknown });
    this.emit(inner);
  }

  /** Convenience: `namespace` is applied on the published envelope. */
  publish<TName extends string, TPayload>(
    name: TName,
    payload: TPayload,
    meta: Partial<EventMeta> = {},
  ): CorrelationId {
    return this.channel.publish(name, payload, { ...meta, namespace: this.namespace });
  }

  on<TPayload>(name: string, fn: EventListener<TPayload>): Unsubscribe {
    return this.channel.events.listen((ev) => {
      if (ev.name !== name) {
        return;
      }
      const evNs = ev.namespace;
      if (evNs != null && evNs !== this.namespace) {
        return;
      }
      (fn as EventListener<TPayload>)(ev.payload as TPayload, ev.meta);
    });
  }
}

export function createChannel(options?: OmegaChannelOptions): OmegaChannel {
  return new OmegaChannel(options);
}
