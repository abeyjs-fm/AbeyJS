import type {
  CorrelationId,
  EventListener,
  EventMeta,
  Intent,
  OmegaChannel,
  OmegaEvent,
  OmegaTypedEvent,
  Unsubscribe,
} from "@abeyjs/core";
import type { OmegaAgentBehaviorContext } from "./behavior/agent-behavior-context.js";
import type { OmegaAgentBehaviorEngine } from "./behavior/agent-behavior-engine.js";
import { OmegaAgentInbox } from "./protocol/agent-inbox.js";
import type { OmegaAgentMessage } from "./protocol/agent-message.js";
import type { AgentMessageRecipient } from "./protocol/agent-protocol.js";

/** Constructor glue: stable id + shared channel + rule engine implementation. */
export interface OmegaAgentContext {
  selfId: string;
  channel: OmegaChannel;
  behavior: OmegaAgentBehaviorEngine;
}

/**
 * Channel-backed actor with a declarative behavior layer plus direct inbox.
 * Incoming events funnel through `handleChannelEvent` → `OmegaAgentBehaviorEngine.evaluate`; rules read
 * `ctx.event` as a full {@link OmegaEvent} (`name`, `payload`, `meta`).
 * Point-to-point traffic lands in {@link receiveMessage}, then subclasses override {@link onMessage}.
 */
export abstract class OmegaAgent implements AgentMessageRecipient {
  readonly id: string;
  protected readonly channel: OmegaChannel;
  readonly behavior: OmegaAgentBehaviorEngine;
  readonly state: Record<string, unknown> = {};
  readonly inbox = new OmegaAgentInbox();
  private readonly unsubs: Unsubscribe[] = [];
  private readonly channelEventUnsub: Unsubscribe;

  protected constructor(ctx: OmegaAgentContext) {
    this.id = ctx.selfId;
    this.channel = ctx.channel;
    this.behavior = ctx.behavior;
    this.channelEventUnsub = this.channel.onAll((ev) => {
      this.handleChannelEvent(ev as OmegaEvent<string, unknown>);
    });
  }

  /** Fan-in from the bus: augment context with mutable `state`, evaluate rules, bubble to {@link onAction}. */
  protected handleChannelEvent(event: OmegaEvent<string, unknown>): void {
    const ctx: OmegaAgentBehaviorContext = { event, state: this.state };
    const reaction = this.behavior.evaluate(ctx);
    if (reaction) {
      this.onAction(reaction.action, reaction.payload);
    }
  }

  /** Flows/call sites push intents here so intents reuse the behavior graph. */
  receiveIntent(intent: Intent): void {
    const ctx: OmegaAgentBehaviorContext = { intent, state: this.state };
    const reaction = this.behavior.evaluate(ctx);
    if (reaction) {
      this.onAction(reaction.action, reaction.payload);
    }
  }

  receiveMessage(msg: OmegaAgentMessage): void {
    this.inbox.receive(msg);
    this.onMessage(msg);
  }

  protected on<TData>(name: string, fn: EventListener<TData>): void {
    this.unsubs.push(this.channel.on<TData>(name, fn));
  }

  /** `publish` on the shared channel with `source` defaulting to this agent id unless overridden. */
  protected publish<TName extends string, TData>(
    name: TName,
    data: TData,
    meta: Partial<EventMeta> & { namespace?: string } = {},
  ): CorrelationId {
    return this.channel.publish(name, data, {
      ...meta,
      source: meta.source ?? this.id,
    });
  }

  /**
   * Fire-and-forget publish by string name plus payload (empty object fallback).
   * Prefer {@link emitEvent} / {@link emitTyped} when the envelope already exists.
   */
  protected emit(name: string, payload?: unknown): CorrelationId {
    return this.channel.publish(name, payload ?? {}, { source: this.id });
  }

  /** Raw {@link OmegaEvent} passthrough onto the underlying channel. */
  protected emitEvent(event: OmegaEvent<string, unknown>): void {
    this.channel.emit(event);
  }

  /** Passthrough for typed emits on the backing channel. */
  protected emitTyped(event: OmegaTypedEvent): void {
    this.channel.emitTyped(event);
  }

  /** Subclasses handle behavior-engine decisions (`action`/`payload`). */
  protected onAction(_action: string, _payload?: unknown): void {}

  /** Hook for envelopes delivered via {@link OmegaAgentProtocol}. */
  protected onMessage(_msg: OmegaAgentMessage): void {}

  abstract connect(): void;

  dispose(): void {
    this.channelEventUnsub();
    for (const u of this.unsubs) {
      u();
    }
    this.unsubs.length = 0;
    this.inbox.clear();
  }
}
