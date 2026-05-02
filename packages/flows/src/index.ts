/**
 * Flow engine: lifecycle orchestration, intent routing, navigator wiring, snapshots.
 */
export {
  CHANNEL_INTENT_FAILED,
  CHANNEL_INTENT_HANDLED,
  CHANNEL_INTENT_RECEIVED,
  createOmegaFlowManager,
  OmegaFlowManager,
  type FlowManagerContext,
} from "./omega-flow-manager.js";

export { OmegaFlowState, type OmegaFlowStateValue, parseOmegaFlowState } from "./omega-flow-state.js";
export { OmegaFlowExpression, omegaFlowExpressionPayloadAs } from "./omega-flow-expression.js";
export type { OmegaFlowContext } from "./omega-flow-context.js";
export {
  type OmegaAppSnapshot,
  type OmegaFlowSnapshot,
  omegaAppSnapshotFromJson,
  omegaAppSnapshotToJson,
  omegaFlowSnapshotFromJson,
  omegaFlowSnapshotToJson,
} from "./omega-flow-snapshot.js";
export type { OmegaSnapshotStorage } from "./omega-snapshot-storage.js";
export {
  OmegaIntentHandlerContext,
  type OmegaIntentHandler,
} from "./omega-intent-handler-context.js";
export { navigationIntentEvent } from "./omega-navigation-constants.js";
export { OmegaFlow } from "./omega-flow.js";
export { OmegaWorkflowFlow, type OmegaWorkflowStepHandler } from "./omega-workflow-flow.js";
export {
  OmegaIntentHandlerPipeline,
  OmegaIntentHandlerPipelineBridge,
  OmegaIntentHandlerPipelinePayload,
} from "./omega-intent-handler-pipeline.js";
export { OmegaIntentReducer } from "./omega-intent-reducer.js";
export { Omega } from "./omega-intent-handle-facade.js";
