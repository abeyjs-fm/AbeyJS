/// <reference types="vite/client" />

declare module "*.view.html" {
  export const template: string;
  export function mount(
    outlet: HTMLElement,
    ctx: Record<string, unknown>,
  ): { render: () => void; dispose: () => void };
}

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: "dev" | "qa" | "prod";
  readonly VITE_API_URL?: string;
  readonly VITE_OPENAPI_URL?: string;
  readonly VITE_INSPECTOR_HUB?: string;
}
