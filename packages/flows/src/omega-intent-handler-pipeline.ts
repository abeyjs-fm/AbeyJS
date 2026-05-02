import type { Intent } from "@abeyjs/core";
import type { OmegaFlowManager } from "./omega-flow-manager.js";
import type { OmegaIntentHandlerContext } from "./omega-intent-handler-context.js";

/**
 * Fluent builder for a single lightweight intent handler (optional validate → async execute → success/error hooks).
 */
export class OmegaIntentHandlerPipeline {
  private constructor() {}

  static withPayload<TPayload>(intentName: string): OmegaIntentHandlerPipelinePayload<TPayload> {
    return new OmegaIntentHandlerPipelinePayload(intentName);
  }
}

export class OmegaIntentHandlerPipelinePayload<TPayload> {
  constructor(private readonly _intentName: string) {}

  private _validate?: (payload: TPayload, intent: Intent, ctx: OmegaIntentHandlerContext) => boolean;

  validate(predicate: (payload: TPayload, intent: Intent, ctx: OmegaIntentHandlerContext) => boolean): this {
    this._validate = predicate;
    return this;
  }

  execute<TResult>(
    body: (payload: TPayload, intent: Intent, ctx: OmegaIntentHandlerContext) => TResult | Promise<TResult>,
  ): OmegaIntentHandlerPipelineBridge<TPayload, TResult> {
    return new OmegaIntentHandlerPipelineBridge(this._intentName, this._validate, body);
  }
}

export class OmegaIntentHandlerPipelineBridge<TPayload, TResult> {
  constructor(
    private readonly _intentName: string,
    private readonly _validate: ((payload: TPayload, intent: Intent, ctx: OmegaIntentHandlerContext) => boolean) | undefined,
    private readonly _execute: (payload: TPayload, intent: Intent, ctx: OmegaIntentHandlerContext) => TResult | Promise<TResult>,
  ) {}

  private _onSuccess?: (result: TResult, intent: Intent, ctx: OmegaIntentHandlerContext) => void;
  private _onError?: (error: unknown, stack: string | undefined, intent: Intent, ctx: OmegaIntentHandlerContext) => void;
  private _onPayloadMissing?: (intent: Intent, ctx: OmegaIntentHandlerContext) => void;

  onSuccess(fn: (result: TResult, intent: Intent, ctx: OmegaIntentHandlerContext) => void): this {
    this._onSuccess = fn;
    return this;
  }

  onError(fn: (error: unknown, stack: string | undefined, intent: Intent, ctx: OmegaIntentHandlerContext) => void): this {
    this._onError = fn;
    return this;
  }

  onPayloadMissing(fn: (intent: Intent, ctx: OmegaIntentHandlerContext) => void): this {
    this._onPayloadMissing = fn;
    return this;
  }

  register(flowManager: OmegaFlowManager, options?: { consumeIntent?: boolean }): void {
    const consumeIntent = options?.consumeIntent ?? false;
    flowManager.registerIntentHandler({
      intentName: this._intentName,
      consumeIntent,
      handler: (intent, ctx) => {
        queueMicrotask(async () => {
          if (intent.payload === undefined) {
            try {
              this._onPayloadMissing?.(intent, ctx);
            } catch (e) {
              console.error("[OmegaIntentHandlerPipeline] onPayloadMissing failed.", e);
            }
            return;
          }
          const payload = intent.payload as TPayload;
          if (this._validate) {
            let ok: boolean;
            try {
              ok = this._validate(payload, intent, ctx);
            } catch (e) {
              console.error("[OmegaIntentHandlerPipeline] validate failed.", e);
              return;
            }
            if (!ok) {
              return;
            }
          }
          try {
            const result = await Promise.resolve(this._execute(payload, intent, ctx));
            this._onSuccess?.(result, intent, ctx);
          } catch (e) {
            const stack = e instanceof Error ? e.stack : undefined;
            this._onError?.(e, stack, intent, ctx);
          }
        });
      },
    });
  }
}
