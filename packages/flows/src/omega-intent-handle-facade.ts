import type { OmegaFlowManager } from "./omega-flow-manager.js";
import type { OmegaIntentHandler } from "./omega-intent-handler-context.js";

/** Tiny facade around {@link OmegaFlowManager.registerIntentHandler}. */
export const Omega = {
  handle(
    flowManager: OmegaFlowManager,
    intentName: string,
    handler: OmegaIntentHandler,
    options?: { consumeIntent?: boolean },
  ): void {
    flowManager.registerIntentHandler({
      intentName,
      handler,
      consumeIntent: options?.consumeIntent ?? false,
    });
  },
};
