import type { OmegaFlowExpression } from "@abeyjs/flows";
import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app-music.view.html";
import musicCssUrl from "./app-music.css?url";
import { MusicEcosystem } from "../omega/music-semantics.js";

function formatMusicExpression(expr: OmegaFlowExpression): { text: string; state: "idle" | "loading" | "success" | "error" | "info" } {
  const p = expr.payload;
  if (expr.type === "loading") return { text: "Cargando tracks…", state: "loading" };
  if (expr.type === "idle") return { text: "Listo", state: "idle" };
  if (expr.type === "error" && p && typeof p === "object" && "message" in p && typeof (p as { message?: unknown }).message === "string") {
    return { text: (p as { message: string }).message, state: "error" };
  }
  if (expr.type === "success" && p && typeof p === "object" && "totalItems" in p) {
    const n = Number((p as { totalItems?: unknown }).totalItems);
    if (Number.isFinite(n)) {
      return { text: `${n.toLocaleString()} resultados`, state: "success" };
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
  selector: "app-music",
  template,
  stylesHrefs: [musicCssUrl],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppMusicElement extends AbeyComponentElement {
  constructor() {
    super();
    this.state = {
      status: "Listo",
      intentLoad: MusicEcosystem.intentLoadTable,
      intentSelection: MusicEcosystem.intentTableSelection,
      intentAction: MusicEcosystem.intentTableAction,
      eventColumns: MusicEcosystem.eventTableColumns,
      eventActions: MusicEcosystem.eventTableActions,
      eventItems: MusicEcosystem.eventTableItems,
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

    const statusChip = this.querySelector("[data-role='music-status']") as HTMLElement | null;

    const flow = runtime.flow.getFlow(MusicEcosystem.flowId);
    const unsubExpr = flow?.subscribeExpressions((expr: OmegaFlowExpression) => {
      const { text, state } = formatMusicExpression(expr);
      (this.state.status as any) = text;
      if (statusChip) statusChip.dataset.state = state;
    });
    if (typeof unsubExpr === "function") this.onDestroy(unsubExpr);
  }
}

