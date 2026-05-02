import type { OmegaRuntime } from "@abeyjs/runtime";
import type { MountRoutedAppConfig } from "../shell/mount-routed-app.js";
import type { PathRouter } from "../router/path-router.js";

/**
 * Rama de rutas públicas (login, etc.) sin shell autenticado.
 * Paridad conceptual con opciones que el host pasa al arranque en Flutter `OmegaScope` / rutas públicas.
 */
export type BootstrapOmegaAuthConfig = {
  /** Rutas (se normalizan como pathname) que muestran UI pública sin el shell. */
  publicPaths: readonly string[];
  isAuthenticated: () => boolean;
  /** Si ya hay sesión en una ruta pública, navegación completa aquí (por defecto `/home`). */
  redirectIfAuthed?: string;
  mountPublic: (root: HTMLElement) => (() => void) | void;
};

/**
 * Configuración del arranque web (shell + runtime opcional + auth opcional).
 * Paridad con el objeto de configuración que alimenta el bootstrap en Flutter (`OmegaConfig` + host).
 */
export type BootstrapOmegaAppConfig = {
  shell: MountRoutedAppConfig;
  /** Se invoca una vez al montar el shell (no en la rama `mountPublic`). */
  createOmega?: () => { runtime: OmegaRuntime };
  auth?: BootstrapOmegaAuthConfig;
};

export type BootstrapOmegaRouter = PathRouter;

export type BootstrapOmegaAppResult = {
  dispose: () => void;
  router?: BootstrapOmegaRouter;
  runtime?: OmegaRuntime;
};
