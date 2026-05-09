import { OmegaAgentBehaviorEngine, OmegaAgentBehaviorRule, OmegaAgentReaction } from "@abeyjs/agents";
import { StudentsEcosystem } from "./semantics.js";

export class StudentsBehavior extends OmegaAgentBehaviorEngine {
  constructor() {
    super();
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === StudentsEcosystem.intentInit,
        () => new OmegaAgentReaction("init"),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === StudentsEcosystem.intentCreate,
        (ctx) => new OmegaAgentReaction("create", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === StudentsEcosystem.intentUpdate,
        (ctx) => new OmegaAgentReaction("update", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === StudentsEcosystem.intentDelete,
        (ctx) => new OmegaAgentReaction("delete", ctx.intent?.payload),
      ),
    );
    this.addRule(
      new OmegaAgentBehaviorRule(
        (ctx) => ctx.intent?.name === StudentsEcosystem.intentLoadGenres,
        (ctx) => new OmegaAgentReaction("loadGenres", ctx.intent?.payload),
      ),
    );
  }
}

