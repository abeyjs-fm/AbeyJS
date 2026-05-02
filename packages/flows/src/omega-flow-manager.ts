import type { EventMeta, OmegaChannel } from "@abeyjs/core";
import { createCorrelationId, type CorrelationId, intentOf } from "@abeyjs/core";
import type { Intent } from "@abeyjs/core";
import type { Unsubscribe } from "@abeyjs/core";
import type { OmegaAppSnapshot, OmegaFlowSnapshot } from "./omega-flow-snapshot.js";
import { OmegaFlow } from "./omega-flow.js";
import { OmegaFlowState } from "./omega-flow-state.js";
import type { OmegaIntentHandler } from "./omega-intent-handler-context.js";
import { OmegaIntentHandlerContext } from "./omega-intent-handler-context.js";
import { navigationIntentEvent } from "./omega-navigation-constants.js";

/** Intent lifecycle markers published on the channel (same envelope shape as {@link OmegaChannel.publish}). */
export const CHANNEL_INTENT_RECEIVED = "omega/intent:received" as const;
export const CHANNEL_INTENT_HANDLED = "omega/intent:handled" as const;
export const CHANNEL_INTENT_FAILED = "omega/intent:failed" as const;

/** Context passed to handlers registered with {@link OmegaFlowManager.registerHandler}. */
export interface FlowManagerContext {
  channel: OmegaChannel;
  source?: string;
  correlationId: CorrelationId;
}

type DispatchHandler = (payload: unknown, ctx: FlowManagerContext) => void | Promise<void>;

type RegisteredIntentHandler = {
  intentName: string;
  handler: OmegaIntentHandler;
  consumeIntent: boolean;
};

/**
 * Owns registered {@link OmegaFlow} instances, coordinates lifecycle, and routes intents through
 * lightweight handlers before optionally fanning out to every running flow.
 */
export class OmegaFlowManager {
  readonly channel: OmegaChannel;
  private readonly _flows = new Map<string, OmegaFlow>();
  private readonly _runningFlows: OmegaFlow[] = [];
  private readonly _intentHandlers: RegisteredIntentHandler[] = [];
  private readonly _dispatchHandlers = new Map<string, DispatchHandler[]>();
  private _navUnsub: Unsubscribe | undefined;

  activeFlowId: string | null = null;

  constructor(channel: OmegaChannel) {
    this.channel = channel;
  }

  registerFlow(flow: OmegaFlow): void {
    const existing = this._flows.get(flow.id);
    if (existing != null && existing !== flow) {
      existing.onFlowStateChanged = undefined;
      const ix = this._runningFlows.indexOf(existing);
      if (ix >= 0) {
        this._runningFlows.splice(ix, 1);
      }
      existing.end();
    }
    this._flows.set(flow.id, flow);
    flow.onFlowStateChanged = () => this._syncRunningMembership(flow);
    this._syncRunningMembership(flow);
  }

  private _syncRunningMembership(flow: OmegaFlow): void {
    if (flow.state === OmegaFlowState.running) {
      if (!this._runningFlows.includes(flow)) {
        this._runningFlows.push(flow);
      }
    } else {
      const i = this._runningFlows.indexOf(flow);
      if (i >= 0) {
        this._runningFlows.splice(i, 1);
      }
    }
  }

  get registeredFlowIds(): Iterable<string> {
    return this._flows.keys();
  }

  getFlow(id: string): OmegaFlow | undefined {
    return this._flows.get(id);
  }

  getFlowFlexible(id: string): OmegaFlow | undefined {
    const direct = this._flows.get(id);
    if (direct) {
      return direct;
    }
    const lower = id.toLowerCase();
    for (const [k, v] of this._flows) {
      if (k.toLowerCase() === lower) {
        return v;
      }
    }
    return undefined;
  }

  getFlowSnapshot(id: string): OmegaFlowSnapshot | undefined {
    return this._flows.get(id)?.getSnapshot();
  }

  getSnapshots(): OmegaFlowSnapshot[] {
    return [...this._flows.values()].map((f) => f.getSnapshot());
  }

  getAppSnapshot(): OmegaAppSnapshot {
    return {
      activeFlowId: this.activeFlowId,
      flows: this.getSnapshots(),
    };
  }

  restoreFromSnapshot(snapshot: OmegaAppSnapshot): void {
    for (const flowSnapshot of snapshot.flows) {
      const flow = this._flows.get(flowSnapshot.flowId);
      if (flow) {
        flow.restoreMemory(flowSnapshot.memory);
      }
    }
    this.activeFlowId = snapshot.activeFlowId;
    if (snapshot.activeFlowId != null) {
      this.switchTo(snapshot.activeFlowId);
    }
  }

  registerIntentHandler(args: { intentName: string; handler: OmegaIntentHandler; consumeIntent?: boolean }): void {
    this._intentHandlers.push({
      intentName: args.intentName,
      handler: args.handler,
      consumeIntent: args.consumeIntent ?? false,
    });
  }

  clearIntentHandlers(): void {
    this._intentHandlers.length = 0;
  }

  /**
   * Register imperative handlers keyed by {@link Intent.name} wire strings; invoked as `(payload, ctx)`.
   * Runtime glue often mirrors these registrations—keep names in sync with your semantics tables.
   */
  registerHandler<TName extends string, TPayload>(
    intentName: TName,
    fn: (payload: TPayload, ctx: FlowManagerContext) => void | Promise<void>,
  ): void {
    const h: DispatchHandler = (payload, ctx) => fn(payload as TPayload, ctx);
    const list = this._dispatchHandlers.get(intentName) ?? [];
    list.push(h);
    this._dispatchHandlers.set(intentName, list);
  }

  /**
   * Dispatches only to {@link registerHandler} handlers. Throws if none; publishes intent lifecycle on the channel.
   */
  async dispatch(intent: Intent, options: { source?: string } = {}): Promise<CorrelationId> {
    const correlationId = intent.meta?.correlationId ?? createCorrelationId();
    const meta: Partial<EventMeta> & { namespace?: string } = {
      correlationId,
      source: options.source ?? "OmegaFlowManager",
    };
    this.channel.publish(CHANNEL_INTENT_RECEIVED, { intent, correlationId }, meta);
    const ctx: FlowManagerContext = { channel: this.channel, source: options.source, correlationId };
    const fns = this._dispatchHandlers.get(intent.name) ?? [];
    if (fns.length === 0) {
      const err = new Error(`No handler for intent: ${intent.name}`);
      this.channel.publish(CHANNEL_INTENT_FAILED, { intent, error: err.message, correlationId }, meta);
      throw err;
    }
    for (const f of fns) {
      await f(intent.payload, ctx);
    }
    this.channel.publish(CHANNEL_INTENT_HANDLED, { intent, correlationId }, meta);
    return correlationId;
  }

  /**
   * Runs lightweight handlers first; if any consumed, running flows do not receive the intent.
   * Publishes intent lifecycle on the channel.
   */
  async handleIntent(intent: Intent, options: { source?: string } = {}): Promise<CorrelationId> {
    const correlationId = intent.meta?.correlationId ?? createCorrelationId();
    const meta: Partial<EventMeta> & { namespace?: string } = {
      correlationId,
      source: options.source ?? "OmegaFlowManager",
    };
    this.channel.publish(CHANNEL_INTENT_RECEIVED, { intent, correlationId }, meta);

    let consume = false;
    const ctx = new OmegaIntentHandlerContext(this.channel, intent);
    for (const h of this._intentHandlers) {
      if (h.intentName !== intent.name) {
        continue;
      }
      try {
        h.handler(intent, ctx);
      } catch (e) {
        console.error("[OmegaFlowManager] Intent handler failed; other handlers and flows still run.", e);
        continue;
      }
      if (h.consumeIntent) {
        consume = true;
      }
    }
    if (consume) {
      this.channel.publish(CHANNEL_INTENT_HANDLED, { intent, correlationId }, meta);
      return correlationId;
    }

    for (const flow of [...this._runningFlows]) {
      flow.receiveIntent(intent);
    }
    this.channel.publish(CHANNEL_INTENT_HANDLED, { intent, correlationId }, meta);
    return correlationId;
  }

  activate(id: string): boolean {
    const flow = this._flows.get(id);
    if (!flow) {
      return false;
    }
    if (flow.state === OmegaFlowState.running) {
      return true;
    }
    flow.start();
    return true;
  }

  activateExclusive(id: string): void {
    for (const flow of this._flows.values()) {
      if (flow.id === id) {
        flow.start();
        this.activeFlowId = id;
      } else if (flow.state === OmegaFlowState.running) {
        flow.pause();
      }
    }
  }

  switchTo(id: string): boolean {
    const target = this._flows.get(id);
    if (!target) {
      return false;
    }
    const alreadyOnlyRunning =
      target.state === OmegaFlowState.running &&
      [...this._flows.values()].every((f) => f.id === id || f.state !== OmegaFlowState.running);
    if (alreadyOnlyRunning) {
      this.activeFlowId = id;
      return true;
    }
    for (const flow of this._flows.values()) {
      if (flow.id === id) {
        flow.start();
        this.activeFlowId = id;
      } else if (flow.state === OmegaFlowState.running) {
        flow.pause();
      }
    }
    return true;
  }

  pause(id: string): void {
    this._flows.get(id)?.pause();
  }

  sleep(id: string): void {
    this._flows.get(id)?.sleep();
  }

  end(id: string): void {
    const flow = this._flows.get(id);
    flow?.end();
    if (this.activeFlowId === id) {
      this.activeFlowId = null;
    }
  }

  endAll(): void {
    for (const flow of this._flows.values()) {
      flow.end();
    }
    this.activeFlowId = null;
  }

  /**
   * Bridges navigation traffic: `navigation.intent` carries a full {@link Intent}; `navigate.*` synthesizes intents
   * from arbitrary channel payloads. Both paths delegate to the supplied `nav.handleIntent`.
   */
  wireNavigator(nav: { handleIntent: (intent: Intent) => void }): void {
    this._navUnsub?.();
    this._navUnsub = this.channel.onAll((ev) => {
      const n = ev.name;
      if (n !== navigationIntentEvent && !n.startsWith("navigate.")) {
        return;
      }
      try {
        if (n === navigationIntentEvent) {
          const asIntent = ev.payload as Intent | undefined;
          if (asIntent && typeof asIntent === "object" && "name" in asIntent) {
            nav.handleIntent(asIntent);
          }
        } else {
          nav.handleIntent(intentOf(n, ev.payload));
        }
      } catch (e) {
        console.error(`[OmegaFlowManager] Navigator handling failed for event "${n}".`, e);
      }
    });
  }

  dispose(): void {
    this._navUnsub?.();
    this._navUnsub = undefined;
    this.clearIntentHandlers();
  }
}

export function createOmegaFlowManager(channel: OmegaChannel): OmegaFlowManager {
  return new OmegaFlowManager(channel);
}
