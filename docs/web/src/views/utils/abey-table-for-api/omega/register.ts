import { intentOf } from "@abeyjs/core";
import type { OmegaHttp } from "@abeyjs/http";
import type { OmegaRuntime } from "@abeyjs/runtime";
import { ArtistAgent } from "./agent.js";
import { ArtistBehavior } from "./behavior.js";
import { ArtistFlow } from "./flow.js";
import { ArtistEcosystem } from "./semantics.js";
import { TOK_DEEZER_HTTP } from "../../../../shared/constants/network.js";

/**
 * Registra agent + flow y enlaza intents a `handleIntent` (running flows).
 * Llamá esto desde `createOmega()` en `src/omegaSetup.ts`.
 */
export function installArtistOmega(runtime: OmegaRuntime): void {
  const http = runtime.get<OmegaHttp>(TOK_DEEZER_HTTP);
  const agent = new ArtistAgent(
    {
      channel: runtime.channel,
      selfId: ArtistEcosystem.agentId,
      behavior: new ArtistBehavior(),
    },
    http,
  );
  const flow = new ArtistFlow(runtime.channel, agent);

  runtime.registerAgent((ch) => {
    if (ch !== runtime.channel) {
      throw new Error("artist: canal inesperado en registerAgent");
    }
    return agent;
  });
  runtime.flow.registerFlow(flow);
  // Keep flows running in parallel; don't pause others.
  runtime.flow.activate(flow.id);

  runtime.onIntent(ArtistEcosystem.intentTick, (payload) => {
    void runtime.flow.handleIntent(intentOf(ArtistEcosystem.intentTick, payload), { source: "artist-ecosystem" });
  });

  runtime.onIntent(ArtistEcosystem.intentLoadTable, (payload) => {
    void runtime.flow.handleIntent(intentOf(ArtistEcosystem.intentLoadTable, payload), { source: "artist-ecosystem" });
  });

  runtime.onIntent(ArtistEcosystem.intentTableSelection, (payload) => {
    void runtime.flow.handleIntent(intentOf(ArtistEcosystem.intentTableSelection, payload), { source: "artist-ecosystem" });
  });

  runtime.onIntent(ArtistEcosystem.intentTableAction, (payload) => {
    void runtime.flow.handleIntent(intentOf(ArtistEcosystem.intentTableAction, payload), { source: "artist-ecosystem" });
  });
}
