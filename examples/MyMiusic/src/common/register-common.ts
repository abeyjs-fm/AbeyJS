import type { OmegaContainer, OmegaRuntime } from "@abeyjs/runtime";
import { createAppHttp } from "./http.js";
import { createDeezerHttp } from "./deezer-http.js";
import { TOK_DEEZER_HTTP, TOK_HTTP } from "./tokens.js";

/** DI module (Autofac-like): register common app services. */
export function registerCommon(c: OmegaContainer, runtime: OmegaRuntime): void {
  c.provideFactory(TOK_HTTP, () => createAppHttp(runtime));
  c.provideFactory(TOK_DEEZER_HTTP, () => createDeezerHttp(runtime));
}

