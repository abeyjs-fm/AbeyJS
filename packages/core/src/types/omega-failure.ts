import type { OmegaObject } from "./omega-object.js";

/** Semantic failure: `id` + `meta` (like `OmegaObject`) + message and optional details. */
export class OmegaFailure implements OmegaObject {
  readonly id: string;
  readonly meta: Record<string, unknown>;
  readonly message: string;
  readonly details?: unknown;

  constructor(init: {
    id: string;
    message: string;
    details?: unknown;
    meta?: Record<string, unknown>;
  }) {
    this.id = init.id;
    this.message = init.message;
    this.details = init.details;
    this.meta = init.meta ?? {};
  }

  toString(): string {
    return `OmegaFailure(id: ${this.id}, message: ${this.message}, details: ${this.details})`;
  }
}
