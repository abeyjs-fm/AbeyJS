import type { Intent, OmegaEvent } from "@abeyjs/core";

/**
 * Inputs to {@link OmegaAgentBehaviorEngine.evaluate}: whichever stimulus fired (channel event or intent)
 * plus the agent `state` map rules may inspect or tweak before returning a reaction.
 */
export interface OmegaAgentBehaviorContext {
  /** Channel event that triggered evaluation, when applicable. */
  event?: OmegaEvent<string, unknown>;
  /** Intent that triggered evaluation, when applicable. */
  intent?: Intent;
  /** Agent internal state at evaluation time; rules may read or mutate entries. */
  state: Record<string, unknown>;
}
