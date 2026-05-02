import { createOmegaRuntime, type OmegaRuntime } from "@abeyjs/runtime";

export function createOmega(): { runtime: OmegaRuntime } {
  const runtime = createOmegaRuntime();
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--abey-slice-max-width", "90%");
  }
  return { runtime };
}
