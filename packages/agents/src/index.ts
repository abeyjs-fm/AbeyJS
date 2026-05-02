/**
 * Agents: rule-driven actors on `@abeyjs/core` channels with optional inbox + protocol helpers.
 */
export type { OmegaAgentBehaviorContext } from "./behavior/agent-behavior-context.js";
export { OmegaAgentBehaviorEngine } from "./behavior/agent-behavior-engine.js";
export { OmegaAgentBehaviorRule } from "./behavior/agent-behavior-rule.js";
export { OmegaAgentReaction } from "./behavior/agent-reaction.js";
export { OmegaAgentInbox } from "./protocol/agent-inbox.js";
export { OmegaAgentMessage } from "./protocol/agent-message.js";
export { OmegaAgentProtocol, type AgentMessageRecipient } from "./protocol/agent-protocol.js";
export { OmegaAgent, type OmegaAgentContext } from "./omega-agent.js";
export { OmegaStatefulAgent } from "./omega-stateful-agent.js";
