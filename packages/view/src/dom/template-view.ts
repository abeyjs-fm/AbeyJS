import {
  mountInterpolatedTemplate,
  type InterpolationBindings,
  type MountedInterpolatedTemplate,
} from "./mount-interpolated-template.js";
import {
  mountReactiveTemplate,
  type MountedReactiveTemplate,
  type ReactiveInterpolationBindings,
} from "./mount-reactive-template.js";

export type TemplateView = {
  mount: (outlet: HTMLElement, bindings: InterpolationBindings) => MountedInterpolatedTemplate;
  mountReactive: (outlet: HTMLElement, bindings: ReactiveInterpolationBindings) => MountedReactiveTemplate;
};

/**
 * Encapsula un template HTML (string) y expone un `mount(outlet, bindings)`.
 * Evita repetir `mountInterpolatedTemplate(outlet, template, ...)` en cada vista.
 */
export function createTemplateView(htmlTemplate: string): TemplateView {
  return {
    mount: (outlet, bindings) => mountInterpolatedTemplate(outlet, htmlTemplate, bindings),
    mountReactive: (outlet, bindings) => mountReactiveTemplate(outlet, htmlTemplate, bindings),
  };
}

