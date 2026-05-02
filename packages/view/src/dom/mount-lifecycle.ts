export type OnDestroy = () => void;

export type MountLifecycle = {
  onInit?: () => void | OnDestroy;
  onDestroy?: OnDestroy;
};

/**
 * Small lifecycle helper (Angular-like): `onInit` runs now; `onDestroy` runs on `abey-dispose`.
 *
 * `mountRoutedApp` calls route `mount(outlet)`; your view can call `mountLifecycle(outlet, ...)`
 * to keep init/teardown in one place.
 */
export function mountLifecycle(outlet: HTMLElement, life: MountLifecycle): void {
  const fromInit = life.onInit?.();
  const onDestroy = typeof fromInit === "function" ? fromInit : life.onDestroy;
  if (!onDestroy) {
    return;
  }
  outlet.addEventListener(
    "abey-dispose",
    () => {
      try {
        onDestroy();
      } catch {
        /* */
      }
    },
    { once: true },
  );
}

