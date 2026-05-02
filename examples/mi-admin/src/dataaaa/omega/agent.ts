import { OmegaStatefulAgent, type OmegaAgentContext } from "@abeyjs/agents";
import type { OmegaAgentMessage } from "@abeyjs/agents";
import { DataaaaEcosystem } from "./semantics.js";

export interface DataaaaViewState {
  tickCount: number;
}

export class DataaaaAgent extends OmegaStatefulAgent<DataaaaViewState> {
  constructor(ctx: OmegaAgentContext) {
    super(ctx, { tickCount: 0 });
  }

  override connect(): void {
    /* Subscribe with this.on(...) when the agent must react to named channel events. */
  }

  protected override onAction(action: string, _payload?: unknown): void {
    if (action === "tick") {
      const next = { tickCount: this.viewState.get().tickCount + 1 };
      this.setViewState(next);
      this.emit(DataaaaEcosystem.eventTicked, { tickCount: next.tickCount });
    }
  }

  protected override onMessage(_msg: OmegaAgentMessage): void {}
}
