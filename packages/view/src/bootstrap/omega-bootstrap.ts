import {
  normalizeBasename,
  normalizePathname,
  stripBasenameFromPathname,
  withBasename,
} from "../router/path-router.js";
import { mountRoutedApp } from "../shell/mount-routed-app.js";
import type {
  BootstrapOmegaAppConfig,
  BootstrapOmegaAppResult,
} from "./omega-config.js";
import { isPublicPath, resolveBootstrapRuntime } from "./omega-runtime.js";

export type {
  BootstrapOmegaAuthConfig,
  BootstrapOmegaAppConfig,
  BootstrapOmegaAppResult,
  BootstrapOmegaRouter,
} from "./omega-config.js";

/**
 * Single browser entrypoint: optional **auth** branch for **public paths**, then **`mountRoutedApp`** + **`resolveBootstrapRuntime`**.
 * Apps should **`import`** **`@abeyjs/view/theme/omega-default.css`** themselves.
 *
 * **Vite HMR:** **`import.meta.hot?.dispose(() => result.dispose())`** in **`main.ts`** to teardown shell/nav.
 */
export function bootstrapOmegaApp(root: HTMLElement, config: BootstrapOmegaAppConfig): BootstrapOmegaAppResult {
  const { shell, createOmega, auth } = config;
  const pathnameBaseNorm = normalizeBasename(shell.pathnameBase ?? "");

  if (auth) {
    const browserPath =
      typeof window !== "undefined" ? window.location.pathname || "/" : "/";
    const pathNorm = pathnameBaseNorm
      ? normalizePathname(stripBasenameFromPathname(browserPath, pathnameBaseNorm))
      : normalizePathname(browserPath);
    if (isPublicPath(pathNorm, auth.publicPaths)) {
      if (auth.isAuthenticated()) {
        const to = auth.redirectIfAuthed ?? "/home";
        if (typeof window !== "undefined") {
          window.location.replace(withBasename(to, pathnameBaseNorm));
        }
        return {
          dispose: () => {
            /* página recarga o navega */
          },
        };
      }
      const publicTeardown = auth.mountPublic(root);
      const pubDispose = typeof publicTeardown === "function" ? publicTeardown : (): void => {};
      return {
        dispose: () => {
          try {
            pubDispose();
          } catch {
            /* */
          }
        },
      };
    }
  }

  const runtime = resolveBootstrapRuntime(createOmega);
  const userOnRouteChange = shell.onRouteChange;
  const initialBrowser =
    typeof window !== "undefined" ? window.location.pathname || "/" : "/";
  let lastPath = pathnameBaseNorm
    ? normalizePathname(stripBasenameFromPathname(initialBrowser, pathnameBaseNorm))
    : normalizePathname(initialBrowser);
  const { router, dispose: shellDispose } = mountRoutedApp(root, {
    ...shell,
    onRouteChange: (path, route) => {
      try {
        runtime?.channel?.publish?.(
          "omega/nav:changed",
          {
            from: lastPath,
            to: path,
            title: route?.title ?? null,
            routePath: route?.path ?? null,
          },
          { source: "abey-router" },
        );
      } catch {
        /* */
      }
      lastPath = path;
      userOnRouteChange?.(path, route);
    },
  });
  return {
    dispose: () => {
      shellDispose();
    },
    router,
    runtime,
  };
}
