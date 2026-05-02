/** Lightweight envelope (`from` → `to`) plus `action`/payload distinct from broadcast channel chatter. */
export class OmegaAgentMessage {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly action: string,
    public readonly payload?: unknown,
  ) {}
}
