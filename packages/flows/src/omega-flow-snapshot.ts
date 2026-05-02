import { OmegaFlowExpression } from "./omega-flow-expression.js";
import { OmegaFlowState, type OmegaFlowStateValue, parseOmegaFlowState } from "./omega-flow-state.js";

/** Snapshot of the current state of an {@link OmegaFlow}. */
export interface OmegaFlowSnapshot {
  flowId: string;
  state: OmegaFlowStateValue;
  memory: Record<string, unknown>;
  lastExpression: OmegaFlowExpression | null;
}

/** Snapshot of app state: active flow plus snapshots of all flows. */
export interface OmegaAppSnapshot {
  activeFlowId: string | null;
  flows: OmegaFlowSnapshot[];
}

export function omegaFlowSnapshotToJson(s: OmegaFlowSnapshot): Record<string, unknown> {
  return {
    flowId: s.flowId,
    state: s.state,
    memory: { ...s.memory },
    ...(s.lastExpression != null
      ? {
          lastExpression: {
            type: s.lastExpression.type,
            ...(s.lastExpression.payload !== undefined ? { payload: s.lastExpression.payload } : {}),
          },
        }
      : {}),
  };
}

export function omegaFlowSnapshotFromJson(json: Record<string, unknown>): OmegaFlowSnapshot {
  const stateStr = (json.state as string) ?? OmegaFlowState.idle;
  const mem = json.memory;
  const memory = mem && typeof mem === "object" && !Array.isArray(mem) ? { ...(mem as Record<string, unknown>) } : {};
  let lastExpression: OmegaFlowExpression | null = null;
  const le = json.lastExpression;
  if (le && typeof le === "object" && !Array.isArray(le)) {
    const m = le as Record<string, unknown>;
    lastExpression = new OmegaFlowExpression((m.type as string) ?? "", m.payload);
  }
  return {
    flowId: (json.flowId as string) ?? "",
    state: parseOmegaFlowState(stateStr),
    memory,
    lastExpression,
  };
}

export function omegaAppSnapshotToJson(s: OmegaAppSnapshot): Record<string, unknown> {
  return {
    activeFlowId: s.activeFlowId,
    flows: s.flows.map(omegaFlowSnapshotToJson),
  };
}

export function omegaAppSnapshotFromJson(json: Record<string, unknown>): OmegaAppSnapshot {
  const activeFlowId = (json.activeFlowId as string) ?? null;
  const flowsList = json.flows;
  const flows =
    Array.isArray(flowsList) && flowsList.length > 0
      ? flowsList
          .filter((e): e is Record<string, unknown> => e != null && typeof e === "object" && !Array.isArray(e))
          .map((e) => omegaFlowSnapshotFromJson(e))
      : [];
  return { activeFlowId, flows };
}
