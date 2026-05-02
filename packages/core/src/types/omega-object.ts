/** Base for Omega system objects (`OmegaEvent`, `OmegaIntent`, `OmegaFailure`). */
export interface OmegaObject {
  readonly id: string;
  readonly meta: Record<string, unknown>;
}
