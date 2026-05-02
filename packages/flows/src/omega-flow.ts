import type {
  CorrelationId,
  EventMeta,
  Intent,
  OmegaChannel,
  OmegaEvent,
  OmegaTypedEvent,
  Unsubscribe,
} from "@abeyjs/core";
import type { OmegaFlowContext } from "./omega-flow-context.js";
import { OmegaFlowExpression } from "./omega-flow-expression.js";
import type { OmegaFlowSnapshot } from "./omega-flow-snapshot.js";
import { OmegaFlowState, type OmegaFlowStateValue } from "./omega-flow-state.js";

/**
 * Stateful coordinator (checkout, onboarding, etc.): listens to the channel, reacts to intents, and emits
 * UI-facing expressions. In {@link onEvent}, `ctx.event` is a full {@link OmegaEvent} (`name`, `payload`, `meta`).
 * Channel + intent handlers only execute while {@link state} is `running`—activate via {@link OmegaFlowManager}.
 */
export abstract class OmegaFlow {
  readonly id: string;
  readonly channel: OmegaChannel;
  state: OmegaFlowStateValue = OmegaFlowState.idle;
  readonly memory: Record<string, unknown> = {};
  onFlowStateChanged?: () => void;

  private _lastExpression: OmegaFlowExpression | null = null;
  private readonly _expressionListeners = new Set<(e: OmegaFlowExpression) => void>();
  private _channelUnsub: Unsubscribe | null = null;
  private _expressionsClosed = false;

  protected constructor(id: string, channel: OmegaChannel) {
    this.id = id;
    this.channel = channel;
    this._channelUnsub = channel.onAll((ev) => {
      this._handleEvent(ev);
    });
  }

  get lastExpression(): OmegaFlowExpression | null {
    return this._lastExpression;
  }

  /** Subscribe to UI-facing expressions (loading, success, error, …). */
  subscribeExpressions(fn: (e: OmegaFlowExpression) => void): Unsubscribe {
    this._expressionListeners.add(fn);
    return () => {
      this._expressionListeners.delete(fn);
    };
  }

  /** `publish` on the shared channel; defaults `meta.source` to this flow id. */
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
   * Convenience publish by string name + payload (same envelope path as {@link OmegaChannel.publish}).
   * Prefer {@link emitEvent} / {@link emitTyped} when the event object already exists.
   */
  protected emit(name: string, payload?: unknown): CorrelationId {
    return this.channel.publish(name, payload ?? {}, { source: this.id });
  }

  /** Passthrough to {@link OmegaChannel.emit}. */
  protected emitEvent(event: OmegaEvent<string, unknown>): void {
    this.channel.emit(event);
  }

  /** Passthrough to {@link OmegaChannel.emitTyped}. */
  protected emitTyped(event: OmegaTypedEvent): void {
    this.channel.emitTyped(event);
  }

  start(): void {
    if (this.state === OmegaFlowState.running) {
      return;
    }
    this.state = OmegaFlowState.running;
    this.onFlowStateChanged?.();
    this.onStart();
  }

  sleep(): void {
    this.state = OmegaFlowState.sleeping;
    this.onFlowStateChanged?.();
    this.onSleep();
  }

  wakeUp(): void {
    this.state = OmegaFlowState.running;
    this.onFlowStateChanged?.();
    this.onWakeUp();
  }

  pause(): void {
    this.state = OmegaFlowState.paused;
    this.onFlowStateChanged?.();
    this.onPause();
  }

  end(): void {
    if (this.state === OmegaFlowState.ended) {
      return;
    }
    this.state = OmegaFlowState.ended;
    this.onFlowStateChanged?.();
    this.onEnd();
    this._channelUnsub?.();
    this._channelUnsub = null;
    this._expressionsClosed = true;
    this._expressionListeners.clear();
  }

  protected onStart(): void {}
  protected onSleep(): void {}
  protected onWakeUp(): void {}
  protected onPause(): void {}
  protected onEnd(): void {}

  private _handleEvent(event: OmegaEvent<string, unknown>): void {
    if (this.state !== OmegaFlowState.running) {
      return;
    }
    const context: OmegaFlowContext = { event, memory: this.memory };
    try {
      this.onEvent(context);
    } catch (e) {
      console.error(`[OmegaFlow] onEvent failed for flow "${this.id}" (event: ${event.name}).`, e);
    }
  }

  /** Reaction to channel events. Only called when running. */
  abstract onEvent(ctx: OmegaFlowContext): void;

  receiveIntent(intent: Intent): void {
    if (this.state !== OmegaFlowState.running) {
      return;
    }
    const context: OmegaFlowContext = { intent, memory: this.memory };
    try {
      this.onIntent(context);
    } catch (e) {
      console.error(`[OmegaFlow] onIntent failed for flow "${this.id}" (intent: ${intent.name}).`, e);
    }
  }

  /** Reaction to intents from UI or agents. Only called when running. */
  abstract onIntent(ctx: OmegaFlowContext): void;

  /**
   * Fan-out to {@link subscribeExpressions} listeners only—does **not** publish on {@link OmegaChannel}.
   */
  emitExpression(expressionType: string, payload?: unknown): void {
    if (this._expressionsClosed) {
      return;
    }
    const expr = new OmegaFlowExpression(expressionType, payload);
    this._lastExpression = expr;
    for (const fn of this._expressionListeners) {
      try {
        fn(expr);
      } catch (e) {
        console.error(`[OmegaFlow] expression listener failed for flow "${this.id}".`, e);
      }
    }
  }

  getSnapshot(): OmegaFlowSnapshot {
    return {
      flowId: this.id,
      state: this.state,
      memory: { ...this.memory },
      lastExpression: this._lastExpression,
    };
  }

  restoreMemory(data: Record<string, unknown>): void {
    for (const k of Object.keys(this.memory)) {
      delete this.memory[k];
    }
    Object.assign(this.memory, data);
  }
}
