import { intentOf } from "@abeyjs/core";
import type { OmegaHttp } from "@abeyjs/http";
import type { OmegaRuntime } from "@abeyjs/runtime";
import { StudentsAgent } from "./agent.js";
import { StudentsBehavior } from "./behavior.js";
import { StudentsFlow } from "./flow.js";
import { StudentsEcosystem } from "./semantics.js";
import { TOK_DEEZER_HTTP } from "../../../../shared/constants/network.js";

/**
 * Registra agent + flow y enlaza intents del CRUD.
 * Llamá `installStudentsOmega(runtime)` desde `src/omegaSetup.ts`.
 */
export function installStudentsOmega(runtime: OmegaRuntime): void {
  const deezerHttp = runtime.get<OmegaHttp>(TOK_DEEZER_HTTP);
  const agent = new StudentsAgent(
    {
      channel: runtime.channel,
      selfId: StudentsEcosystem.agentId,
      behavior: new StudentsBehavior(),
    },
    deezerHttp,
  );
  const flow = new StudentsFlow(runtime.channel, agent);

  runtime.registerAgent((ch) => {
    if (ch !== runtime.channel)
      throw new Error("students: canal inesperado en registerAgent");
    return agent;
  });

  runtime.flow.registerFlow(flow);
  runtime.flow.activate(flow.id);

  runtime.onIntent(StudentsEcosystem.intentInit, (payload: unknown) => {
    void runtime.flow.handleIntent(
      intentOf(StudentsEcosystem.intentInit, payload),
      { source: "Students-ecosystem" },
    );
  });
  runtime.onIntent(StudentsEcosystem.intentCreate, (payload: unknown) => {
    void runtime.flow.handleIntent(
      intentOf(StudentsEcosystem.intentCreate, payload),
      { source: "Students-ecosystem" },
    );
  });
  runtime.onIntent(StudentsEcosystem.intentUpdate, (payload: unknown) => {
    void runtime.flow.handleIntent(
      intentOf(StudentsEcosystem.intentUpdate, payload),
      { source: "Students-ecosystem" },
    );
  });
  runtime.onIntent(StudentsEcosystem.intentDelete, (payload: unknown) => {
    void runtime.flow.handleIntent(
      intentOf(StudentsEcosystem.intentDelete, payload),
      { source: "Students-ecosystem" },
    );
  });
  runtime.onIntent(StudentsEcosystem.intentLoadGenres, (payload: unknown) => {
    void runtime.flow.handleIntent(
      intentOf(StudentsEcosystem.intentLoadGenres, payload),
      { source: "Students-ecosystem" },
    );
  });
}
