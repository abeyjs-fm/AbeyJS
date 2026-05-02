import { intentOf } from "@abeyjs/core";
import type { OmegaHttp } from "@abeyjs/http";
import type { OmegaRuntime } from "@abeyjs/runtime";
import { TOK_DEEZER_HTTP } from "../../../common/tokens.js";
import { AlumnosAgent } from "./agent.js";
import { AlumnosBehavior } from "./behavior.js";
import { AlumnosFlow } from "./flow.js";
import { AlumnosEcosystem } from "./semantics.js";

/**
 * Registra agent + flow y enlaza intents del CRUD.
 * Llamá `installAlumnosOmega(runtime)` desde `src/omegaSetup.ts`.
 */
export function installAlumnosOmega(runtime: OmegaRuntime): void {
  const deezerHttp = runtime.get<OmegaHttp>(TOK_DEEZER_HTTP);
  const agent = new AlumnosAgent({
    channel: runtime.channel,
    selfId: AlumnosEcosystem.agentId,
    behavior: new AlumnosBehavior(),
  }, deezerHttp);
  const flow = new AlumnosFlow(runtime.channel, agent);

  runtime.registerAgent((ch) => {
    if (ch !== runtime.channel) throw new Error("alumnos: canal inesperado en registerAgent");
    return agent;
  });

  runtime.flow.registerFlow(flow);
  runtime.flow.activate(flow.id);

  runtime.onIntent(AlumnosEcosystem.intentInit, (payload: unknown) => {
    void runtime.flow.handleIntent(intentOf(AlumnosEcosystem.intentInit, payload), { source: "alumnos-ecosystem" });
  });
  runtime.onIntent(AlumnosEcosystem.intentCreate, (payload: unknown) => {
    void runtime.flow.handleIntent(intentOf(AlumnosEcosystem.intentCreate, payload), { source: "alumnos-ecosystem" });
  });
  runtime.onIntent(AlumnosEcosystem.intentUpdate, (payload: unknown) => {
    void runtime.flow.handleIntent(intentOf(AlumnosEcosystem.intentUpdate, payload), { source: "alumnos-ecosystem" });
  });
  runtime.onIntent(AlumnosEcosystem.intentDelete, (payload: unknown) => {
    void runtime.flow.handleIntent(intentOf(AlumnosEcosystem.intentDelete, payload), { source: "alumnos-ecosystem" });
  });
  runtime.onIntent(AlumnosEcosystem.intentLoadGenres, (payload: unknown) => {
    void runtime.flow.handleIntent(intentOf(AlumnosEcosystem.intentLoadGenres, payload), { source: "alumnos-ecosystem" });
  });
}

