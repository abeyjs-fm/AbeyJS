/**
 * Minimal contract for {@link OmegaRuntime.registerAgent}; typically implemented by **`OmegaAgent`** in **`@abeyjs/agents`**.
 */
export interface OmegaRegisteredAgent {
  readonly id: string;
  connect(): void;
  dispose(): void;
}
