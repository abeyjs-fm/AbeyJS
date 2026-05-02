import type { OmegaChannel } from "@abeyjs/core";
import { OmegaAgentMessage } from "./agent-message.js";

/** Anything that can ingest {@link OmegaAgentMessage} payloads (typically an {@link OmegaAgent}). */
export interface AgentMessageRecipient {
  readonly id: string;
  receiveMessage(msg: OmegaAgentMessage): void;
}

/**
 * Lightweight registry keyed by agent id so **send** can resolve `msg.to`, while **broadcast**
 * loops every registrant using synthetic envelopes whose `from` is `system`.
 */
export class OmegaAgentProtocol {
  readonly agents = new Map<string, AgentMessageRecipient>();

  constructor(public readonly channel: OmegaChannel) {}

  register(agent: AgentMessageRecipient): void {
    this.agents.set(agent.id, agent);
  }

  unregister(id: string): void {
    this.agents.delete(id);
  }

  send(msg: OmegaAgentMessage): void {
    this.agents.get(msg.to)?.receiveMessage(msg);
  }

  broadcast(action: string, payload?: unknown): void {
    for (const agent of this.agents.values()) {
      agent.receiveMessage(new OmegaAgentMessage("system", agent.id, action, payload));
    }
  }
}
