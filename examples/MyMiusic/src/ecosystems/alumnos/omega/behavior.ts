import { OmegaAgentBehaviorEngine, OmegaAgentBehaviorRule, OmegaAgentReaction } from "@abeyjs/agents";
import { AlumnosEcosystem } from "./semantics.js";

export class AlumnosBehavior extends OmegaAgentBehaviorEngine {
  constructor() {
    super();
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === AlumnosEcosystem.intentInit,
        () => new OmegaAgentReaction("init"),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === AlumnosEcosystem.intentCreate,
        (ctx) => new OmegaAgentReaction("create", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === AlumnosEcosystem.intentUpdate,
        (ctx) => new OmegaAgentReaction("update", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === AlumnosEcosystem.intentDelete,
        (ctx) => new OmegaAgentReaction("delete", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === AlumnosEcosystem.intentLoadGenres,
        (ctx) => new OmegaAgentReaction("loadGenres", ctx.intent?.payload),
      ),
    );
  }
}

