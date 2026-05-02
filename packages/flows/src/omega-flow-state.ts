/** Lifecycle states for an {@link OmegaFlow}. Only `running` flows process channel events and intents. */
export const OmegaFlowState = {
  idle: "idle",
  running: "running",
  sleeping: "sleeping",
  paused: "paused",
  ended: "ended",
} as const;

export type OmegaFlowStateValue = (typeof OmegaFlowState)[keyof typeof OmegaFlowState];

export function parseOmegaFlowState(s: string): OmegaFlowStateValue {
  if (s === OmegaFlowState.running) return OmegaFlowState.running;
  if (s === OmegaFlowState.sleeping) return OmegaFlowState.sleeping;
  if (s === OmegaFlowState.paused) return OmegaFlowState.paused;
  if (s === OmegaFlowState.ended) return OmegaFlowState.ended;
  return OmegaFlowState.idle;
}
