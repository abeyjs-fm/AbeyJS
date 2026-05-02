/**
 * Stable identifier for an agent registration.
 * {@link omegaAgentIdEnumWire} freezes an enum/key string as id; {@link omegaAgentId} accepts the final literal.
 */
export interface OmegaAgentId {
  readonly id: string;
}

export function omegaAgentIdEnumWire(enumMemberName: string): OmegaAgentId {
  return { id: enumMemberName };
}

export function omegaAgentId(id: string): OmegaAgentId {
  return { id };
}
