/** Behavior engine verdict handed to subclasses through {@link OmegaAgent.onAction}. */
export class OmegaAgentReaction {
  constructor(
    public readonly action: string,
    public readonly payload?: unknown,
  ) {}
}
