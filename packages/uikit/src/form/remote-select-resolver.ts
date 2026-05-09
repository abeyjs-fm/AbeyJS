import type { FieldSelectOptions } from "./form-types.js";
import { intentOf } from "@abeyjs/core";

/** 
 * Unique request ID for async correlation. 
 */
export function createReqId(): string {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export interface RemoteSelectResolverOptions {
  runtime: any;
  channel: any;
  intent: string;
  event: string;
  source?: string;
  timeoutMs?: number;
}

/**
 * Creates a resolver for AbeyFormConfig.resolveSelectOptions that implements
 * the request-response pattern via an intent and a channel event.
 */
export function createRemoteSelectResolver(options: RemoteSelectResolverOptions) {
  const { runtime, channel, intent, event, source, timeoutMs = 7000 } = options;

  return async (opts: FieldSelectOptions): Promise<Array<{ value: string; label: string }>> => {
    if (!runtime || !channel?.on) return [];

    const requestId = createReqId();
    
    return new Promise((resolve) => {
      let done = false;
      
      const finish = (items: Array<{ value: string; label: string }>) => {
        if (done) return;
        done = true;
        off?.();
        window.clearTimeout(timer);
        resolve(items);
      };

      const off = channel.on(event, (payload: unknown): void => {
        const p = (payload ?? {}) as {
          requestId?: string;
          items?: Array<{ value?: unknown; label?: unknown }>;
        };
        
        if (String(p.requestId ?? "") !== requestId) return;
        
        const items = Array.isArray(p.items)
          ? p.items
              .map((it) => ({
                value: String(it?.value ?? "").trim(),
                label: String(it?.label ?? "").trim(),
              }))
              .filter((it) => it.value !== "" && it.label !== "")
          : [];
          
        finish(items);
      });

      const timer = window.setTimeout(() => finish([]), timeoutMs);

      void runtime.dispatch(
        intentOf(intent, {
          requestId,
          select: opts,
        }),
        { source }
      );
    });
  };
}
