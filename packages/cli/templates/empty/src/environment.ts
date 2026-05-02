export type OmegaEnvironmentName = "dev" | "qa" | "prod";

function readEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

export const environment = (() => {
  const e = readEnv();
  const appEnv = (e.VITE_APP_ENV ?? (import.meta as any).env?.MODE ?? "dev") as OmegaEnvironmentName | string;
  const name: OmegaEnvironmentName =
    appEnv === "qa" ? "qa" : appEnv === "prod" || appEnv === "production" ? "prod" : "dev";

  return {
    name,
    mode: String((import.meta as any).env?.MODE ?? name),
    apiUrl: String(e.VITE_API_URL ?? "").trim(),
    openApiUrl: String(e.VITE_OPENAPI_URL ?? "").trim(),
    inspectorHub: String(e.VITE_INSPECTOR_HUB ?? "").trim(),
  };
})();

