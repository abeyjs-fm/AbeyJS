import type { OmegaChannel } from "@abeyjs/core";
import type { OmegaFlowContext } from "@abeyjs/flows";
import { OmegaFlow } from "@abeyjs/flows";
import { DataaaaAgent } from "./agent.js";
import { DataaaaEcosystem } from "./semantics.js";

export class DataaaaFlow extends OmegaFlow {
  private readonly agent: DataaaaAgent;

  constructor(channel: OmegaChannel, agent: DataaaaAgent) {
    super(DataaaaEcosystem.flowId, channel);
    this.agent = agent;
  }

  override onStart(): void {
    this.emitExpression("idle");
  }

  override onIntent(ctx: OmegaFlowContext): void {
    const intent = ctx.intent;
    if (intent?.name === DataaaaEcosystem.intentTick) {
      this.emitExpression("loading");
      this.agent.receiveIntent(intent);
    }
  }

  override onEvent(ctx: OmegaFlowContext): void {
    const ev = ctx.event;
    if (ev?.name === DataaaaEcosystem.eventTicked) {
      this.emitExpression("success", ev.payload);
    }
  }
}
