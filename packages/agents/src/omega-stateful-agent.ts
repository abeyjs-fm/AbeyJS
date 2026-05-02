import { StateCell } from "@abeyjs/state";
import type { OmegaAgentContext } from "./omega-agent.js";
import { OmegaAgent } from "./omega-agent.js";

/**
 * Agent variant that exposes readable view state via {@link StateCell} while preserving
 * {@link OmegaAgent.state} for coarse rule bookkeeping.
 */
export abstract class OmegaStatefulAgent<TState> extends OmegaAgent {
  readonly viewState: StateCell<TState>;

  protected constructor(ctx: OmegaAgentContext, initialViewState: TState) {
    super(ctx);
    this.viewState = new StateCell(initialViewState);
  }

  protected setViewState(next: TState): void {
    this.viewState.set(next);
  }
}
