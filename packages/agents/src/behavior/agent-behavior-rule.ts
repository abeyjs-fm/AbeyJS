import type { OmegaAgentBehaviorContext } from "./agent-behavior-context.js";
import type { OmegaAgentReaction } from "./agent-reaction.js";

/**
 * Predicate + factory: `condition(context)` selects; `reaction(context)` emits the resulting {@link OmegaAgentReaction}.
 */
export class OmegaAgentBehaviorRule {
  constructor(
    public readonly condition: (context: OmegaAgentBehaviorContext) => boolean,
    public readonly reaction: (context: OmegaAgentBehaviorContext) => OmegaAgentReaction,
  ) {}
}
