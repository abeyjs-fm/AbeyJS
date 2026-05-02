import { OmegaAgentBehaviorEngine, OmegaAgentBehaviorRule, OmegaAgentReaction } from "@abeyjs/agents";
import { DataaaaEcosystem } from "./semantics.js";

export class DataaaaBehavior extends OmegaAgentBehaviorEngine {
  constructor() {
    super();
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === DataaaaEcosystem.intentTick,
        () => new OmegaAgentReaction("tick"),
      ),
    );
  }
}
