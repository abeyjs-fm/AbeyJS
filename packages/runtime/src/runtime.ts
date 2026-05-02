import { type OmegaChannel, createChannel } from "@abeyjs/core";
import type { OmegaRegisteredAgent } from "./omega-registered-agent.js";
import type { Intent } from "@abeyjs/core";
import { createOmegaFlowManager, type FlowManagerContext, type OmegaFlowManager } from "@abeyjs/flows";
import { OmegaContainer, type OmegaToken } from "./omega-container.js";

/** One snapshot of bus traffic mirrored from **`OmegaChannel`** (HTTP, flows, agents, etc.). */
export interface RuntimeTraceEvent {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  /** Event payload; e.g. `omega/http:error` may include **`network`** and **`status`**. */
  data: any;
  correlationId: string;
  timestamp: number;
  source?: string;
}

/**
 * Named extension hook: run when the app wires the runtime (**`install`**) with optional teardown on replace/unregister.
 */
export type OmegaPlugin = {
  id: string;
  /** Called during wiring; may return **`() => void`** to unsubscribe or release resources. */
  install: (r: OmegaRuntime) => (() => void) | void;
};

/**
 * Autofac-style module: **`(container, runtime) => void`**. Executes at most once per function reference (**`registerModule`**).
 */
export type OmegaModule = (c: OmegaContainer, r: OmegaRuntime) => void;

/**
 * Composition root — **`channel`**, **`flow`**, **`di`**, agent/plugin lifecycle, mirrored **trace**.
 *
 * **Trace:** **`onAll`** listener appends flattened **`RuntimeTraceEvent`** (ring max **2000**). Failures parsing odd payloads never throw.
 *
 * See **`README.md`** for URL bridge and Inspector interaction.
 */
export class OmegaRuntime {
  readonly channel: OmegaChannel;
  readonly flow: OmegaFlowManager;
  readonly di = new OmegaContainer();
  private readonly agents = new Map<string, OmegaRegisteredAgent>();
  private readonly pluginUnsubs = new Map<string, (() => void) | void>();
  private readonly _modules = new WeakSet<OmegaModule>();
  private _trace: RuntimeTraceEvent[] = [];
  private _traceOn = true;

  constructor(c?: OmegaChannel) {
    this.channel = c ?? createChannel();
    this.flow = createOmegaFlowManager(this.channel);
    this.channel.onAll((ev) => {
      if (!this._traceOn) {
        return;
      }
      try {
        this._trace.push({
          name: ev.name,
          data: ev.payload,
          correlationId: ev.meta.correlationId,
          timestamp: ev.meta.timestamp,
          source: ev.meta.source,
        });
        if (this._trace.length > 2000) {
          this._trace = this._trace.slice(-2000);
        }
      } catch {
        /* trace must not break the bus if payloads are malformed */
      }
    });
  }

  /**
   * Current trace buffer (**read-only** at type-level); the runtime keeps appending while tracing is enabled (max **2000** slides).
   */
  getTraceSnapshot(): Readonly<RuntimeTraceEvent[]> {
    return this._trace;
  }

  /** When **`false`**, **`onAll`** stops appending (**`getTraceSnapshot`** keeps existing rows). */
  setTraceEnabled(on: boolean): void {
    this._traceOn = on;
  }

  /**
   * Install a **`OmegaPlugin`**; same **`id`** replaces the previous installation after running prior teardown (if any).
   */
  registerPlugin(p: OmegaPlugin): void {
    this.unregisterPlugin(p.id);
    const teardown = p.install(this);
    if (typeof teardown === "function") {
      this.pluginUnsubs.set(p.id, teardown);
    }
  }

  /** Runs plugin teardown when provided, then removes the plugin slot. */
  unregisterPlugin(id: string): void {
    const fn = this.pluginUnsubs.get(id);
    this.pluginUnsubs.delete(id);
    if (typeof fn === "function") {
      try {
        fn();
      } catch {
        /* */
      }
    }
  }

  /**
   * Registers an **agent** tied to **`this.channel`**; **`factory`** must return **`OmegaRegisteredAgent`** (**`connect`** after replace).
   * Previous agent sharing **`id`** is **`dispose`**d first.
   */
  registerAgent(factory: (channel: OmegaChannel) => OmegaRegisteredAgent): void {
    const a = factory(this.channel);
    if (this.agents.has(a.id)) {
      this.agents.get(a.id)?.dispose();
    }
    a.connect();
    this.agents.set(a.id, a);
  }

  /** Dispatch intent (same as app shell entry). */
  dispatch(i: Intent, o?: { source?: string }): ReturnType<OmegaFlowManager["dispatch"]> {
    return this.flow.dispatch(i, o);
  }

  /** Delegates to **`flow.registerHandler`** — key is **`Intent.name`**. */
  onIntent<TName extends string, TPayload>(
    intentName: TName,
    fn: (payload: TPayload, ctx: FlowManagerContext) => void | Promise<void>,
  ): void {
    this.flow.registerHandler<TName, TPayload>(intentName, fn);
  }

  /** **`dispose`** every agent, clears agent map, unregisters all plugins (teardown hooks). */
  disposeAll(): void {
    for (const a of this.agents.values()) {
      a.dispose();
    }
    this.agents.clear();
    for (const id of Array.from(this.pluginUnsubs.keys())) {
      this.unregisterPlugin(id);
    }
  }

  /**
   * Registers a DI module once. Similar to Autofac `builder.RegisterModule(...)`.
   * If the same function is passed twice, it only runs once.
   */
  registerModule(m: OmegaModule): void {
    if (this._modules.has(m)) {
      return;
    }
    this._modules.add(m);
    m(this.di, this);
  }

  registerModules(modules: OmegaModule[]): void {
    for (const m of modules) {
      this.registerModule(m);
    }
  }

  provide<T>(token: OmegaToken, value: T): void {
    this.di.provide(token, value);
  }

  provideFactory<T>(token: OmegaToken, factory: () => T): void {
    this.di.provideFactory(token, factory);
  }

  get<T>(token: OmegaToken): T {
    return this.di.get(token);
  }

  tryGet<T>(token: OmegaToken): T | undefined {
    return this.di.tryGet(token);
  }
}

/**
 * Construct **`OmegaRuntime`** with optional shared **`OmegaChannel`** (omit to **`createChannel()`** internally).
 */
export function createOmegaRuntime(partial?: { channel?: OmegaChannel }): OmegaRuntime {
  return new OmegaRuntime(partial?.channel);
}
