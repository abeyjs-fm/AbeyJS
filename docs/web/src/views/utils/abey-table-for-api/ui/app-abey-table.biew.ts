import type { OmegaFlowExpression } from "@abeyjs/flows";
import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { AbeyTableElement } from "@abeyjs/uikit";
import { template } from "./app-abey-table.view.html";
import abeyTableKitCss from "@abeyjs/uikit/styles/abey-table.css?inline";
import abeyTableCss from "./app-abey-table.view.css?inline";
import { ArtistEcosystem } from "../omega/semantics.js";
import type { DeezerArtist } from "../model/artist.types.js";

function formatArtistExpression(expr: OmegaFlowExpression): { text: string; state: "idle" | "loading" | "success" | "error" | "info" } {
  const p = expr.payload;
  if (expr.type === "loading") return { text: "Cargando artistas…", state: "loading" };
  if (expr.type === "idle") return { text: "Listo", state: "idle" };
  if (expr.type === "error" && p && typeof p === "object" && "message" in p && typeof (p as { message?: unknown }).message === "string") {
    return { text: (p as { message: string }).message, state: "error" };
  }
  if (expr.type === "success" && p && typeof p === "object" && "totalItems" in p) {
    const n = Number((p as { totalItems?: unknown }).totalItems);
    if (Number.isFinite(n)) {
      return { text: `${n.toLocaleString()} en catálogo`, state: "success" };
    }
  }
  if (expr.type === "tableSelection") {
    const ids = (p as { selectedIds?: string[] } | undefined)?.selectedIds ?? [];
    return { text: ids.length ? `${ids.length} seleccionados` : "Sin selección", state: "info" };
  }
  if (expr.type === "tableAction") {
    const a = (p as { actionId?: string; rowId?: string } | undefined)?.actionId ?? "?";
    return { text: `Acción: ${a}`, state: "info" };
  }
  return { text: expr.type, state: "info" };
}

@AbeyComponent({
  selector: "app-abey-table",
  template,
  stylesText: [abeyTableKitCss, abeyTableCss],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppAbeyTableElement extends AbeyComponentElement {
  constructor() {
    super();
    this.state = {
      status: "Listo",
      intentLoad: ArtistEcosystem.intentLoadTable,
      intentSelection: ArtistEcosystem.intentTableSelection,
      intentAction: ArtistEcosystem.intentTableAction,
      eventColumns: ArtistEcosystem.eventTableColumns,
      eventActions: ArtistEcosystem.eventTableActions,
      eventItems: ArtistEcosystem.eventTableItems,
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#wire();
    });
  }

  #wire(): void {
    const runtime = this.runtime;
    if (!runtime) return;

    AbeyTableElement.define("abey-table");
    const table = this.querySelector("abey-table") as AbeyTableElement<DeezerArtist> | null;
    if (table) {
      table.config = {
        rows: [],
        columns: [],
        actions: [],
        selectable: true,
        getRowId: (r) => String(r.id),
      };
    }

    const statusChip = this.querySelector("[data-role='artist-status']") as HTMLElement | null;
    const flow = runtime.flow.getFlow(ArtistEcosystem.flowId);
    const unsubExpr = flow?.subscribeExpressions((expr: OmegaFlowExpression) => {
      const { text, state } = formatArtistExpression(expr);
      (this.state.status as any) = text;
      if (statusChip) statusChip.dataset.state = state;
    });
    if (typeof unsubExpr === "function") this.onDestroy(unsubExpr);
  }
}

