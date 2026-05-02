import type { OmegaChannel } from "@abeyjs/core";
import type { Intent } from "@abeyjs/core";

/** Context passed to lightweight {@link OmegaFlowManager.registerIntentHandler} callbacks. */
export class OmegaIntentHandlerContext {
  constructor(
    readonly channel: OmegaChannel,
    readonly intent: Intent,
  ) {}
}

export type OmegaIntentHandler = (intent: Intent, context: OmegaIntentHandlerContext) => void;
