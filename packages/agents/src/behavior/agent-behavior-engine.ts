import type { OmegaAgentBehaviorContext } from "./agent-behavior-context.js";
import type { OmegaAgentReaction } from "./agent-reaction.js";
import type { OmegaAgentBehaviorRule } from "./agent-behavior-rule.js";

/**
 * Ordered rule list evaluated against {@link OmegaAgentBehaviorContext}; first matching rule yields a reaction.
 */
export class OmegaAgentBehaviorEngine {
  private readonly rules: OmegaAgentBehaviorRule[] = [];

  /** Order matters: the first matching {@link OmegaAgentBehaviorRule.condition} wins. */
  addRule(rule: OmegaAgentBehaviorRule): void {
    this.rules.push(rule);
  }

  /** Returns the first matching reaction, or `undefined`. */
  evaluate(context: OmegaAgentBehaviorContext): OmegaAgentReaction | undefined {
    for (const rule of this.rules) {
      if (rule.condition(context)) {
        return rule.reaction(context);
      }
    }
    return undefined;
  }
}
