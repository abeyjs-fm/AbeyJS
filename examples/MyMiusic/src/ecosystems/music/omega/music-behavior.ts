import { OmegaAgentBehaviorEngine, OmegaAgentBehaviorRule, OmegaAgentReaction } from "@abeyjs/agents";
import { MusicEcosystem } from "./music-semantics.js";

export class MusicBehavior extends OmegaAgentBehaviorEngine {
  constructor() {
    super();
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === MusicEcosystem.intentLoadTable,
        (ctx) => new OmegaAgentReaction("loadTable", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === MusicEcosystem.intentTableSelection,
        (ctx) => new OmegaAgentReaction("tableSelection", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === MusicEcosystem.intentTableAction,
        (ctx) => new OmegaAgentReaction("tableAction", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === MusicEcosystem.intentTick,
        () => new OmegaAgentReaction("tick"),
      ),
    );
  }
}
