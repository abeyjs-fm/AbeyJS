/// <reference types="vite/client" />
declare module "*.html?raw" {
  const html: string;
  export default html;
}

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: "dev" | "qa" | "prod";
  readonly VITE_API_URL?: string;
  readonly VITE_OPENAPI_URL?: string;
  readonly VITE_INSPECTOR_HUB?: string;
}
