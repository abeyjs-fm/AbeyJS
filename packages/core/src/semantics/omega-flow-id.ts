/** Typed flow id (stable string used with `OmegaFlow` / `OmegaFlowManager`). */
export interface OmegaFlowId {
  readonly id: string;
}

export function omegaFlowIdEnumWire(enumMemberName: string): OmegaFlowId {
  return { id: enumMemberName };
}


export function omegaFlowId(id: string): OmegaFlowId {
  return { id };
}
