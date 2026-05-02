import type { OmegaEvent } from "@abeyjs/core";
import type { Intent } from "@abeyjs/core";

/**
 * Payload handed to {@link OmegaFlow.onEvent} / {@link OmegaFlow.onIntent}: whichever stimulus fired plus shared `memory`.
 */
export type OmegaFlowContext = {
  /** Set when {@link OmegaFlow.onEvent} runs. */
  event?: OmegaEvent<string, unknown>;
  /** Set when {@link OmegaFlow.onIntent} runs. */
  intent?: Intent;
  /** Flow memory; shared between onEvent and onIntent; included in snapshots. */
  memory: Record<string, unknown>;
};
