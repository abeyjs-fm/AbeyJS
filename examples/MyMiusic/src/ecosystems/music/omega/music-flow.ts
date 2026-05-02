import type { OmegaChannel } from "@abeyjs/core";
import type { OmegaFlowContext } from "@abeyjs/flows";
import { OmegaFlow } from "@abeyjs/flows";
import { MusicAgent } from "./music-agent.js";
import { MusicEcosystem, type MusicFlowNotifyPayload } from "./music-semantics.js";

export class MusicFlow extends OmegaFlow {
  private readonly agent: MusicAgent;

  constructor(channel: OmegaChannel, agent: MusicAgent) {
    super(MusicEcosystem.flowId, channel);
    this.agent = agent;
  }

  override onStart(): void {
    this.emitExpression("idle");
  }

  override onIntent(ctx: OmegaFlowContext): void {
    const intent = ctx.intent;
    if (intent?.name === MusicEcosystem.intentTick) {
      this.emitExpression("loading");
      this.agent.receiveIntent(intent);
      return;
    }

    if (intent?.name === MusicEcosystem.intentLoadTable) {
      const p = (intent.payload ?? {}) as { page?: number; pageSize?: number; query?: string };
      this.emitExpression("loading", { page: p.page, pageSize: p.pageSize, query: p.query ?? "" });
      this.agent.receiveIntent(intent);
      return;
    }

    if (intent?.name === MusicEcosystem.intentTableSelection || intent?.name === MusicEcosystem.intentTableAction) {
      this.agent.receiveIntent(intent);
    }
  }

  override onEvent(ctx: OmegaFlowContext): void {
    const ev = ctx.event;
    if (ev?.name === MusicEcosystem.eventTicked) {
      this.emitExpression("success", ev.payload);
      return;
    }
    if (ev?.name === MusicEcosystem.eventFlowNotify) {
      const p = ev.payload as MusicFlowNotifyPayload;
      if (p.type === "loadSuccess") {
        this.emitExpression("success", { totalItems: p.totalItems });
        return;
      }
      if (p.type === "loadError") {
        this.emitExpression("error", { message: p.message });
        return;
      }
      if (p.type === "selection") {
        this.emitExpression("tableSelection", { selectedIds: p.selectedIds });
        return;
      }
      if (p.type === "action") {
        this.emitExpression("tableAction", { actionId: p.actionId, rowId: p.rowId });
      }
    }
  }
}
