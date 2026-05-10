// Helper for Vite configs: re-tag Vite logs as "[abey]".
// Import and use in `vite.config.ts` only.
import { createLogger } from "vite";

export type AbeyViteLoggerOptions = {
  tag?: string;
};

export function createAbeyViteLogger(opts: AbeyViteLoggerOptions = {}) {
  const tag = (opts.tag ?? "abeyJs").trim() || "abeyJs";
  const base = createLogger("info", { allowClearScreen: false });
  const reTag = (msg: string) =>
    String(msg)
      .replace(/\[vite\]/gi, `[${tag}]`)
      .replace(/VITE/g, "AbeyJs")
      .replace(/vite/g, "abeyjs");

  // Global intercept to catch messages that bypass customLogger (like server restarts or port conflicts)
  if (
    typeof process !== "undefined" &&
    process.stdout &&
    !(process.stdout as any)._abeyHooked
  ) {
    const originalStdout = process.stdout.write;
    process.stdout.write = function (chunk: any, ...args: any[]) {
      if (typeof chunk === "string") chunk = reTag(chunk);
      return originalStdout.apply(process.stdout, [chunk, ...args] as any);
    };
    (process.stdout as any)._abeyHooked = true;

    const originalStderr = process.stderr.write;
    process.stderr.write = function (chunk: any, ...args: any[]) {
      if (typeof chunk === "string") chunk = reTag(chunk);
      return originalStderr.apply(process.stderr, [chunk, ...args] as any);
    };
  }

  return {
    ...base,
    info(msg: any, opts2?: any) {
      base.info(reTag(msg), opts2);
    },
    warn(msg: any, opts2?: any) {
      base.warn(reTag(msg), opts2);
    },
    warnOnce(msg: any, opts2?: any) {
      (base as any).warnOnce?.(reTag(msg), opts2);
    },
    error(msg: any, opts2?: any) {
      base.error(reTag(msg), opts2);
    },
  };
}
