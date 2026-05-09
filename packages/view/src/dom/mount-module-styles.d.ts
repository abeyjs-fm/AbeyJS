export type ModuleStylesHandle = {
    dispose: () => void;
};
/**
 * Loads CSS files (as `<link rel="stylesheet">`) for the lifetime of a mounted module/view.
 * When disposed, reference counts are decremented and unused `<link>` tags are removed.
 *
 * Usage:
 * - `const styles = mountModuleStyles([new URL("./view.css", import.meta.url).href]);`
 * - call `styles.dispose()` when unmounting the view.
 */
export declare function mountModuleStyles(hrefs: string[]): ModuleStylesHandle;
//# sourceMappingURL=mount-module-styles.d.ts.map