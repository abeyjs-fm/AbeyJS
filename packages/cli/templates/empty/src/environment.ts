export type OmegaEnvironmentName = "dev" | "qa" | "prod";

export const environment = (() => {
  const e = import.meta.env;
  const appEnv = (e.VITE_APP_ENV ?? e.MODE ?? "dev") as OmegaEnvironmentName | string;
  const name: OmegaEnvironmentName =
    appEnv === "qa" ? "qa" : appEnv === "prod" || appEnv === "production" ? "prod" : "dev";

  return {
    name,
    mode: String(e.MODE ?? name),
    apiUrl: String(e.VITE_API_URL ?? "").trim(),
    openApiUrl: String(e.VITE_OPENAPI_URL ?? "").trim(),
    inspectorHub: String(e.VITE_INSPECTOR_HUB ?? "").trim(),
  };
})();

