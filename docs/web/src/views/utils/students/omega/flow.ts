import type { OmegaChannel } from "@abeyjs/core";
import type { OmegaFlowContext } from "@abeyjs/flows";
import { OmegaFlow } from "@abeyjs/flows";
import { StudentsAgent } from "./agent.js";
import { StudentsEcosystem } from "./semantics.js";

export class StudentsFlow extends OmegaFlow {
  private readonly agent: StudentsAgent;

  constructor(channel: OmegaChannel, agent: StudentsAgent) {
    super(StudentsEcosystem.flowId, channel);
    this.agent = agent;
  }

  override onStart(): void {
    this.emitExpression("idle");
  }

  override onIntent(ctx: OmegaFlowContext): void {
    const intent = ctx.intent;
    if (
      intent?.name === StudentsEcosystem.intentInit ||
      intent?.name === StudentsEcosystem.intentCreate ||
      intent?.name === StudentsEcosystem.intentUpdate ||
      intent?.name === StudentsEcosystem.intentDelete ||
      intent?.name === StudentsEcosystem.intentLoadGenres
    ) {
      this.agent.receiveIntent(intent);
    }
  }

  override onEvent(ctx: OmegaFlowContext): void {
    const ev = ctx.event;
    if (ev?.name === StudentsEcosystem.eventChanged) {
      this.emitExpression("changed", ev.payload);
      return;
    }
    if (ev?.name === StudentsEcosystem.eventInvalid) {
      this.emitExpression("invalid", ev.payload);
      return;
    }
    if (ev?.name === StudentsEcosystem.eventGenres) {
      this.emitExpression("genres", ev.payload);
    }
  }
}

