import { OmegaAgentBehaviorEngine, OmegaAgentBehaviorRule, OmegaAgentReaction } from "@abeyjs/agents";
import { ArtistEcosystem } from "./semantics.js";

export class ArtistBehavior extends OmegaAgentBehaviorEngine {
  constructor() {
    super();
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === ArtistEcosystem.intentLoadTable,
        (ctx) => new OmegaAgentReaction("loadTable", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === ArtistEcosystem.intentTableSelection,
        (ctx) => new OmegaAgentReaction("tableSelection", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === ArtistEcosystem.intentTableAction,
        (ctx) => new OmegaAgentReaction("tableAction", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === ArtistEcosystem.intentTick,
        () => new OmegaAgentReaction("tick"),
      ),
    );
  }
}
