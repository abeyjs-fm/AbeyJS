export type ActionHandler = (el: HTMLElement, ev: Event) => void;

export type ActionMap = Record<string, ActionHandler>;

/**
 * Declarative click binding via `data-action`, similar in spirit to Angular template events.
 *
 * Usage:
 * - HTML: `<button data-action="save">Save</button>`
 * - TS: `const dispose = bindActions(root, { save: () => ... })`
 */
export function bindActions(root: HTMLElement, actions: ActionMap, options?: { eventType?: string }): () => void {
  const type = options?.eventType ?? "click";
  const onEvent = (ev: Event): void => {
    const target = ev.target instanceof Element ? ev.target : null;
    if (!target) {
      return;
    }
    const el = target.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) {
      return;
    }
    const name = el.dataset.action?.trim();
    if (!name) {
      return;
    }
    const handler = actions[name];
    if (!handler) {
      return;
    }
    handler(el, ev);
  };

  root.addEventListener(type, onEvent);
  return () => {
    root.removeEventListener(type, onEvent);
  };
}

