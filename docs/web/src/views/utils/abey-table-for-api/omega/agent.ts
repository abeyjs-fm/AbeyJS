import { OmegaStatefulAgent, type OmegaAgentContext } from "@abeyjs/agents";
import type { OmegaAgentMessage } from "@abeyjs/agents";
import type { OmegaHttp } from "@abeyjs/http";
import { DeezerArtistRepo } from "../data/artist.repo.js";
import type { DeezerArtist } from "../model/artist.types.js";
import { ArtistEcosystem, type ArtistFlowNotifyPayload } from "./semantics.js";

export interface ArtistViewState {
  tickCount: number;
}

export class ArtistAgent extends OmegaStatefulAgent<ArtistViewState> {
  readonly artistRepo: DeezerArtistRepo;

  constructor(ctx: OmegaAgentContext, http: OmegaHttp) {
    super(ctx, { tickCount: 0 });
    this.artistRepo = new DeezerArtistRepo(http);
  }

  override connect(): void {
    /* Suscribite al canal con this.on(...) si el agente debe reaccionar a eventos por nombre. */
  }

  protected override onAction(action: string, payload?: unknown): void {
    if (action === "tick") {
      const next = { tickCount: this.viewState.get().tickCount + 1 };
      this.setViewState(next);
      this.emit(ArtistEcosystem.eventTicked, { tickCount: next.tickCount });
      return;
    }
    if (action === "loadTable") {
      void this.#handleLoadTable(payload as { page?: number; pageSize?: number; query?: string } | undefined);
      return;
    }
    if (action === "tableSelection") {
      const p = (payload ?? {}) as { selectedIds?: string[] };
      const n: ArtistFlowNotifyPayload = { type: "selection", selectedIds: p.selectedIds ?? [] };
      this.emit(ArtistEcosystem.eventFlowNotify, n);
      return;
    }
    if (action === "tableAction") {
      const p = (payload ?? {}) as { actionId?: string; rowId?: string };
      const n: ArtistFlowNotifyPayload = {
        type: "action",
        actionId: p.actionId ?? "",
        rowId: p.rowId ?? "",
      };
      this.emit(ArtistEcosystem.eventFlowNotify, n);
    }
  }

  async #handleLoadTable(p: { page?: number; pageSize?: number; query?: string } | undefined): Promise<void> {
    this.emit(ArtistEcosystem.eventTableColumns, {
      columns: [
        { key: "name", header: "Artist", width: "320px" },
        { key: "nb_fan", header: "Fans", width: "140px", align: "right" },
        { key: "nb_album", header: "Albums", width: "140px", align: "right" },
        { key: "link", header: "Link", width: "120px", frozen: "" },
      ],
    });
    this.emit(ArtistEcosystem.eventTableActions, {
      actions: [{ id: "open", label: "Open" }],
    });

    try {
      const page = await this.artistRepo.page({
        page: Number(p?.page ?? 1),
        pageSize: Number(p?.pageSize ?? 10),
        query: p?.query,
      });
      const items = page.items as DeezerArtist[];
      this.emit(ArtistEcosystem.eventTableItems, {
        items,
        totalItems: page.totalItems,
        page: page.page,
        pageSize: page.pageSize,
      });
      this.emit(ArtistEcosystem.eventFlowNotify, { type: "loadSuccess", totalItems: page.totalItems });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const pageSize = Number(p?.pageSize ?? 10);
      this.emit(ArtistEcosystem.eventFlowNotify, { type: "loadError", message, pageSize });
      this.emit(ArtistEcosystem.eventTableItems, {
        items: [],
        totalItems: 0,
        page: 1,
        pageSize,
      });
    }
  }

  protected override onMessage(_msg: OmegaAgentMessage): void {}
}
