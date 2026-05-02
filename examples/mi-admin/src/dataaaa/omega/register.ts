import { intentOf } from "@abeyjs/core";
import type { OmegaRuntime } from "@abeyjs/runtime";
import { DataaaaAgent } from "./agent.js";
import { DataaaaBehavior } from "./behavior.js";
import { DataaaaFlow } from "./flow.js";
import { DataaaaEcosystem } from "./semantics.js";

/**
 * Registers the agent + flow and wires intents into `handleIntent` for running flows.
 * Call from `createOmega()` in `src/omegaSetup.ts`.
 */
export function installDataaaaOmega(runtime: OmegaRuntime): void {
  const agent = new DataaaaAgent({
    channel: runtime.channel,
    selfId: DataaaaEcosystem.agentId,
    behavior: new DataaaaBehavior(),
  });
  const flow = new DataaaaFlow(runtime.channel, agent);

  runtime.registerAgent((ch) => {
    if (ch !== runtime.channel) {
      throw new Error("dataaaa: unexpected channel in registerAgent");
    }
    return agent;
  });
  runtime.flow.registerFlow(flow);
  // Keep flows running in parallel; don't pause others.
  runtime.flow.activate(flow.id);

  runtime.onIntent(DataaaaEcosystem.intentTick, (payload) => {
    void runtime.flow.handleIntent(intentOf(DataaaaEcosystem.intentTick, payload), { source: "dataaaa-ecosystem" });
  });

  runtime.onIntent(DataaaaEcosystem.intentLoadTable, (payload) => {
    void runtime.flow.handleIntent(intentOf(DataaaaEcosystem.intentLoadTable, payload), { source: "dataaaa-ecosystem" });
  });

  runtime.onIntent(DataaaaEcosystem.intentTableSelection, (payload) => {
    void runtime.flow.handleIntent(intentOf(DataaaaEcosystem.intentTableSelection, payload), { source: "dataaaa-ecosystem" });
  });

  runtime.onIntent(DataaaaEcosystem.intentTableAction, (payload) => {
    void runtime.flow.handleIntent(intentOf(DataaaaEcosystem.intentTableAction, payload), { source: "dataaaa-ecosystem" });
  });
}
