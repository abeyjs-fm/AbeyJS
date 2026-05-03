import type { OmegaFlowExpression } from "@abeyjs/flows";
import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import type { AbeyTableConfig } from "@abeyjs/uikit";
import { template } from "./app-abey-table.view.html";
import abeyTableKitCss from "@abeyjs/uikit/styles/abey-table.css?inline";
import abeyTableCss from "./app-abey-table.view.css?inline";
import { isDeezerProdRelayAbsent } from "../../../../shared/htpp/http-providers.js";
import { ArtistEcosystem } from "../omega/semantics.js";
import type { DeezerArtist } from "../model/artist.types.js";

function formatArtistExpression(expr: OmegaFlowExpression): { text: string; state: "idle" | "loading" | "success" | "error" | "info" } {
  const p = expr.payload;
  if (expr.type === "loading") return { text: "Loading artists…", state: "loading" };
  if (expr.type === "idle") return { text: "Ready", state: "idle" };
  if (expr.type === "error" && p && typeof p === "object" && "message" in p && typeof (p as { message?: unknown }).message === "string") {
    return { text: (p as { message: string }).message, state: "error" };
  }
  if (expr.type === "success" && p && typeof p === "object" && "totalItems" in p) {
    const n = Number((p as { totalItems?: unknown }).totalItems);
    if (Number.isFinite(n)) {
      return { text: `${n.toLocaleString()} in catalog`, state: "success" };
    }
  }
  if (expr.type === "tableSelection") {
    const ids = (p as { selectedIds?: string[] } | undefined)?.selectedIds ?? [];
    return { text: ids.length ? `${ids.length} selected` : "None selected", state: "info" };
  }
  if (expr.type === "tableAction") {
    const a = (p as { actionId?: string; rowId?: string } | undefined)?.actionId ?? "?";
    return { text: `Action: ${a}`, state: "info" };
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
      flowBanner: "Ready",
      flowBannerTone: "idle",
      tableConfig: {
        rows: [],
        columns: [],
        actions: [],
        selectable: true,
        getRowId: (r: DeezerArtist) => String(r.id),
      } satisfies AbeyTableConfig<DeezerArtist>,
      demoHint: isDeezerProdRelayAbsent()
        ? "Live rows need the Deezer relay: add GitHub Actions secret VITE_DEEZER_HTTP_BASE (Worker URL from docs/web/edge/deezer-proxy). Static hosts cannot call api.deezer.com from the browser (CORS); without the secret this page uses a tiny embedded sample only."
        : "Try searching for artists and changing pages: each action triggers a remote load.",
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

    const flow = runtime.flow.getFlow(ArtistEcosystem.flowId);
    const unsubExpr = flow?.subscribeExpressions((expr: OmegaFlowExpression) => {
      const { text, state } = formatArtistExpression(expr);
      (this.state.flowBanner as string) = text;
      (this.state.flowBannerTone as string) = state;
    });
    if (typeof unsubExpr === "function") this.onDestroy(unsubExpr);
  }
}

