import type { OmegaChannel } from "@abeyjs/core";
import type { OmegaFlowContext } from "@abeyjs/flows";
import { OmegaFlow } from "@abeyjs/flows";
import { AlumnosAgent } from "./agent.js";
import { AlumnosEcosystem } from "./semantics.js";

export class AlumnosFlow extends OmegaFlow {
  private readonly agent: AlumnosAgent;

  constructor(channel: OmegaChannel, agent: AlumnosAgent) {
    super(AlumnosEcosystem.flowId, channel);
    this.agent = agent;
  }

  override onStart(): void {
    this.emitExpression("idle");
  }

  override onIntent(ctx: OmegaFlowContext): void {
    const intent = ctx.intent;
    if (
      intent?.name === AlumnosEcosystem.intentInit ||
      intent?.name === AlumnosEcosystem.intentCreate ||
      intent?.name === AlumnosEcosystem.intentUpdate ||
      intent?.name === AlumnosEcosystem.intentDelete ||
      intent?.name === AlumnosEcosystem.intentLoadGenres
    ) {
      this.agent.receiveIntent(intent);
    }
  }

  override onEvent(ctx: OmegaFlowContext): void {
    const ev = ctx.event;
    if (ev?.name === AlumnosEcosystem.eventChanged) {
      this.emitExpression("changed", ev.payload);
      return;
    }
    if (ev?.name === AlumnosEcosystem.eventInvalid) {
      this.emitExpression("invalid", ev.payload);
      return;
    }
    if (ev?.name === AlumnosEcosystem.eventGenres) {
      this.emitExpression("genres", ev.payload);
    }
  }
}

