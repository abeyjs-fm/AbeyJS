/**
 * Nombres de agente, flow, intents y eventos del ecosistema Artist.
 * Generado por `abeyjs generate ecosystem`.
 */
export const ArtistEcosystem = {
  agentId: "ecosystem:artist:agent",
  flowId: "ecosystem:artist:flow",
  intentTick: "Artist/Tick",
  intentLoadTable: "Artist/TableLoad",
  intentTableSelection: "Artist/TableSelection",
  intentTableAction: "Artist/TableAction",
  eventTicked: "omega/ecosystem/artist/ticked",
  eventTableColumns: "omega/ecosystem/artist/tableColumns",
  eventTableActions: "omega/ecosystem/artist/tableActions",
  eventTableItems: "omega/ecosystem/artist/tableItems",
  eventFlowNotify: "omega/ecosystem/artist/flowNotify",
} as const;

export type ArtistFlowNotifyPayload =
  | { type: "loadSuccess"; totalItems: number }
  | { type: "loadError"; message: string; pageSize?: number }
  | { type: "selection"; selectedIds: string[] }
  | { type: "action"; actionId: string; rowId: string };
