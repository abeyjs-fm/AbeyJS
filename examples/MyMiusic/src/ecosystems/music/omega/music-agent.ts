import { OmegaStatefulAgent, type OmegaAgentContext } from "@abeyjs/agents";
import type { OmegaAgentMessage } from "@abeyjs/agents";
import type { OmegaHttp } from "@abeyjs/http";
import { DeezerTrackRepo } from "../data/deezer-track.repo.js";
import type { MusicTrackRow } from "../model/track.types.js";
import { MusicEcosystem, type MusicFlowNotifyPayload } from "./music-semantics.js";

export interface MusicViewState {
  tickCount: number;
}

export class MusicAgent extends OmegaStatefulAgent<MusicViewState> {
  readonly trackRepo: DeezerTrackRepo;

  constructor(ctx: OmegaAgentContext, http: OmegaHttp) {
    super(ctx, { tickCount: 0 });
    this.trackRepo = new DeezerTrackRepo(http);
  }

  override connect(): void {
    /* Suscribite al canal con this.on(...) si el agente debe reaccionar a eventos por nombre. */
  }

  protected override onAction(action: string, payload?: unknown): void {
    if (action === "tick") {
      const next = { tickCount: this.viewState.get().tickCount + 1 };
      this.setViewState(next);
      this.emit(MusicEcosystem.eventTicked, { tickCount: next.tickCount });
      return;
    }
    if (action === "loadTable") {
      void this.#handleLoadTable(payload as { page?: number; pageSize?: number; query?: string } | undefined);
      return;
    }
    if (action === "tableSelection") {
      const p = (payload ?? {}) as { selectedIds?: string[] };
      const n: MusicFlowNotifyPayload = { type: "selection", selectedIds: p.selectedIds ?? [] };
      this.emit(MusicEcosystem.eventFlowNotify, n);
      return;
    }
    if (action === "tableAction") {
      const p = (payload ?? {}) as { actionId?: string; rowId?: string };
      const n: MusicFlowNotifyPayload = {
        type: "action",
        actionId: p.actionId ?? "",
        rowId: p.rowId ?? "",
      };
      this.emit(MusicEcosystem.eventFlowNotify, n);
    }
  }

  async #handleLoadTable(p: { page?: number; pageSize?: number; query?: string } | undefined): Promise<void> {
    this.emit(MusicEcosystem.eventTableColumns, {
      columns: [
        { key: "rank", header: "#", width: "64px", align: "right", frozen: "left" },
        { key: "cover", header: "", width: "52px" },
        { key: "title", header: "Título", width: "220px" },
        { key: "artist", header: "Artista", width: "160px" },
        { key: "albumTitle", header: "Álbum", width: "160px" },
        { key: "durationLabel", header: "Duración", width: "88px", align: "right" },
        { key: "link", header: "Enlace", width: "88px", frozen: "right" },
      ],
    });

    this.emit(MusicEcosystem.eventTableActions, {
      actions: [
        { id: "open", label: "Abrir" },
        { id: "delete", label: "Eliminar" },
      ],
    });

    try {
      const page = await this.trackRepo.page({
        page: Number(p?.page ?? 1),
        pageSize: Number(p?.pageSize ?? 10),
        query: p?.query,
      });
      const items = page.items as MusicTrackRow[];
      this.emit(MusicEcosystem.eventTableItems, {
        items,
        totalItems: page.totalItems,
        page: page.page,
        pageSize: page.pageSize,
      });
      this.emit(MusicEcosystem.eventFlowNotify, { type: "loadSuccess", totalItems: page.totalItems });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const pageSize = Number(p?.pageSize ?? 10);
      this.emit(MusicEcosystem.eventFlowNotify, { type: "loadError", message, pageSize });
      this.emit(MusicEcosystem.eventTableItems, {
        items: [],
        totalItems: 0,
        page: 1,
        pageSize,
      });
    }
  }

  protected override onMessage(_msg: OmegaAgentMessage): void {}
}

