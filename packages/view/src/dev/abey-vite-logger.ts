// Helper for Vite configs: re-tag Vite logs as "[abey]".
// Import and use in `vite.config.ts` only.
import { createLogger } from "vite";

export type AbeyViteLoggerOptions = {
  tag?: string;
};

export function createAbeyViteLogger(opts: AbeyViteLoggerOptions = {}) {
  const tag = (opts.tag ?? "abey").trim() || "abey";
  const base = createLogger("info", { allowClearScreen: false });
  const reTag = (msg: string) => msg.replace(/\[vite\]/g, `[${tag}]`);
  return {
    ...base,
    info(msg: any, opts2?: any) {
      base.info(reTag(String(msg)), opts2);
    },
    warn(msg: any, opts2?: any) {
      base.warn(reTag(String(msg)), opts2);
    },
    warnOnce(msg: any, opts2?: any) {
      (base as any).warnOnce?.(reTag(String(msg)), opts2);
    },
    error(msg: any, opts2?: any) {
      base.error(reTag(String(msg)), opts2);
    },
  };
}

