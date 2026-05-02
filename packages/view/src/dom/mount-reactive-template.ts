import {
  mountInterpolatedTemplate,
  type InterpolationBinding,
  type InterpolationBindings,
  type InterpolationValue,
  type MountedInterpolatedTemplate,
} from "./mount-interpolated-template.js";
import { isSignal, type OmegaReadableSignal, type Unsubscribe } from "../state/signal.js";

export type ReactiveInterpolationBinding = InterpolationBinding | OmegaReadableSignal<unknown>;
export type ReactiveInterpolationBindings = Record<string, ReactiveInterpolationBinding>;

export type MountedReactiveTemplate = MountedInterpolatedTemplate & {
  dispose: () => void;
};

function toInterpolationBindings(bindings: ReactiveInterpolationBindings): {
  bindings: InterpolationBindings;
  unsubs: Unsubscribe[];
} {
  const out: InterpolationBindings = {};
  const unsubs: Unsubscribe[] = [];

  for (const [k, v] of Object.entries(bindings)) {
    if (isSignal(v)) {
      const s = v as OmegaReadableSignal<unknown>;
      out[k] = () => s.get() as InterpolationValue;
      continue;
    }
    out[k] = v as InterpolationBinding;
  }

  return { bindings: out, unsubs };
}

/**
 * Mounts an interpolated template and automatically re-renders when any bound signal changes.
 *
 * Signals are passed directly as bindings: `{ name: mySignal }`.
 */
export function mountReactiveTemplate(
  outlet: HTMLElement,
  html: string,
  bindings: ReactiveInterpolationBindings,
): MountedReactiveTemplate {
  const { bindings: plain } = toInterpolationBindings(bindings);
  const mounted = mountInterpolatedTemplate(outlet, html, plain);

  const unsubs: Unsubscribe[] = [];
  for (const v of Object.values(bindings)) {
    if (isSignal(v)) {
      const unsub = (v as OmegaReadableSignal<unknown>).subscribe(() => mounted.render());
      unsubs.push(unsub);
    }
  }

  return {
    ...mounted,
    dispose: () => {
      for (const u of unsubs) u();
      mounted.dispose();
    },
  };
}

