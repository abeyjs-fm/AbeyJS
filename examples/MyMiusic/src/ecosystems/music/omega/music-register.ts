import { intentOf } from "@abeyjs/core";
import type { OmegaHttp } from "@abeyjs/http";
import type { OmegaRuntime } from "@abeyjs/runtime";
import { TOK_DEEZER_HTTP } from "../../../common/tokens.js";
import { MusicAgent } from "./music-agent.js";
import { MusicBehavior } from "./music-behavior.js";
import { MusicFlow } from "./music-flow.js";
import { MusicEcosystem } from "./music-semantics.js";

/**
 * Registra agent + flow y enlaza intents a `handleIntent` (running flows).
 * Llamá esto desde `createOmega()` en `src/omegaSetup.ts`.
 */
export function installMusicOmega(runtime: OmegaRuntime): void {
  const http = runtime.get<OmegaHttp>(TOK_DEEZER_HTTP);
  const agent = new MusicAgent(
    {
      channel: runtime.channel,
      selfId: MusicEcosystem.agentId,
      behavior: new MusicBehavior(),
    },
    http,
  );
  const flow = new MusicFlow(runtime.channel, agent);

  runtime.registerAgent((ch) => {
    if (ch !== runtime.channel) {
      throw new Error("music: canal inesperado en registerAgent");
    }
    return agent;
  });
  runtime.flow.registerFlow(flow);
  runtime.flow.activate(flow.id);

  runtime.onIntent(MusicEcosystem.intentTick, (payload) => {
    void runtime.flow.handleIntent(intentOf(MusicEcosystem.intentTick, payload), { source: "music-ecosystem" });
  });

  runtime.onIntent(MusicEcosystem.intentLoadTable, (payload) => {
    void runtime.flow.handleIntent(intentOf(MusicEcosystem.intentLoadTable, payload), { source: "music-ecosystem" });
  });

  runtime.onIntent(MusicEcosystem.intentTableSelection, (payload) => {
    void runtime.flow.handleIntent(intentOf(MusicEcosystem.intentTableSelection, payload), { source: "music-ecosystem" });
  });

  runtime.onIntent(MusicEcosystem.intentTableAction, (payload) => {
    void runtime.flow.handleIntent(intentOf(MusicEcosystem.intentTableAction, payload), { source: "music-ecosystem" });
  });
}

