import { mountModuleStyles } from "@abeyjs/runtime";

/**
 * Wraps a mount function with module-local styles lifecycle.
 * Useful for views that don't use `createTemplateView` (e.g. `.abey` compiled mounts).
 */
export function withModuleStyles(
  stylesHrefs: string[],
  mount: (outlet: HTMLElement) => void | (() => void),
): (outlet: HTMLElement) => void | (() => void) {
  return (outlet) => {
    const styles = mountModuleStyles(stylesHrefs);
    const cleanup = mount(outlet);
    return () => {
      try {
        (typeof cleanup === "function" ? cleanup : undefined)?.();
      } finally {
        styles.dispose();
      }
    };
  };
}

