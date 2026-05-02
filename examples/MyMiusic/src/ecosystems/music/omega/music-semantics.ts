/**
 * Nombres de agente, flow, intents y eventos del ecosistema Music.
 * Generado por `abeyjs generate ecosystem`.
 */
export const MusicEcosystem = {
  agentId: "ecosystem:music:agent",
  flowId: "ecosystem:music:flow",
  intentTick: "Music/Tick",
  intentLoadTable: "Music/TableLoad",
  intentTableSelection: "Music/TableSelection",
  intentTableAction: "Music/TableAction",
  eventTicked: "omega/ecosystem/music/ticked",
  eventTableColumns: "omega/ecosystem/music/tableColumns",
  eventTableActions: "omega/ecosystem/music/tableActions",
  eventTableItems: "omega/ecosystem/music/tableItems",
  /** Agente → flow: resultado de carga / selección / acción (el flow traduce a `emitExpression`). */
  eventFlowNotify: "omega/ecosystem/music/flowNotify",
} as const;

export type MusicFlowNotifyPayload =
  | { type: "loadSuccess"; totalItems: number }
  | { type: "loadError"; message: string; pageSize?: number }
  | { type: "selection"; selectedIds: string[] }
  | { type: "action"; actionId: string; rowId: string };

