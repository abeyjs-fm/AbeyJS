import type { Intent } from "@abeyjs/core";
import type { OmegaFlowManager } from "./omega-flow-manager.js";

/**
 * Mutable cell folded by intent handlers registered against the same {@link OmegaFlowManager}.
 */
export class OmegaIntentReducer<T> {
  private _state: T;

  constructor(initial: T, private readonly _flowManager: OmegaFlowManager) {
    this._state = initial;
  }

  get state(): T {
    return this._state;
  }

  on(
    intentName: string,
    reducer: (previous: T, intent: Intent) => T,
    options?: { consumeIntent?: boolean },
  ): void {
    const consumeIntent = options?.consumeIntent ?? true;
    this._flowManager.registerIntentHandler({
      intentName,
      consumeIntent,
      handler: (intent) => {
        this._state = reducer(this._state, intent);
      },
    });
  }
}
