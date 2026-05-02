import type { OmegaAgentMessage } from "./agent-message.js";

/** FIFO backlog for envelopes awaiting explicit draining by the owning agent. */
export class OmegaAgentInbox {
  private readonly queue: OmegaAgentMessage[] = [];

  /** `> 0` limita el tamaño (se descarta el más antiguo); `0` = sin límite. */
  constructor(public readonly maxMessages = 0) {}

  receive(message: OmegaAgentMessage): void {
    if (this.maxMessages > 0 && this.queue.length >= this.maxMessages) {
      this.queue.shift();
    }
    this.queue.push(message);
  }

  next(): OmegaAgentMessage | undefined {
    return this.queue.shift();
  }

  get hasMessages(): boolean {
    return this.queue.length > 0;
  }

  get length(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.length = 0;
  }
}
