import { intentOf } from "@abeyjs/core";
import type { OmegaRuntime } from "@abeyjs/runtime";
import type { ViewTheme } from "./form-types.js";

export function mountIntentButton(
  root: HTMLElement,
  runtime: OmegaRuntime,
  label: string,
  type: string,
  payload: unknown,
  options?: { theme?: ViewTheme },
): void {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "abey-btn";
  btn.textContent = label;
  if (options?.theme) {
    for (const [k, v] of Object.entries(options.theme.vars ?? {})) {
      if (v !== undefined) {
        btn.style.setProperty(k, v);
      }
    }
    for (const c of (options.theme.className ?? "")
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      btn.classList.add(c);
    }
  }
  btn.addEventListener("click", () => {
    void runtime.dispatch(intentOf(type, payload), { source: "abey-uikit" });
  });
  root.appendChild(btn);
}
