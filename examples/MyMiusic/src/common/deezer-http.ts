import type { OmegaHttp } from "@abeyjs/http";
import type { OmegaRuntime } from "@abeyjs/runtime";
import { createHttpClient } from "./http.js";

/**
 * Deezer es público, así que evitamos auth y usamos el proxy `/api/deezer` (vite.config.ts).
 * En prod podrías apuntar a tu propio backend/proxy.
 */
export function createDeezerHttp(runtime: OmegaRuntime): OmegaHttp {
  return createHttpClient(runtime, {
    baseUrl: "/api/deezer",
    source: "deezer-api",
    withAuth: false,
    cache: { enabled: true, ttlMs: 30_000 },
  });
}

