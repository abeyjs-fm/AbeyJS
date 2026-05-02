import type { OmegaChannel } from "@abeyjs/core";
import type { OmegaFlowContext } from "./omega-flow-context.js";
import { OmegaFlow } from "./omega-flow.js";

export type OmegaWorkflowStepHandler = () => void | Promise<void>;

/**
 * Step-driven flow: call `defineStep` in the subclass constructor, move the machine with `startAt` / `next`,
 * and emit the standard `workflow.*` expression family for UI chrome.
 */
export abstract class OmegaWorkflowFlow extends OmegaFlow {
  protected constructor(id: string, channel: OmegaChannel) {
    super(id, channel);
  }

  override onIntent(_ctx: OmegaFlowContext): void {}

  override onEvent(_ctx: OmegaFlowContext): void {}

  private _currentStepId: string | null = null;
  private readonly _steps = new Map<string, OmegaWorkflowStepHandler>();

  get currentStepId(): string | null {
    return this._currentStepId;
  }

  defineStep(id: string, handler: OmegaWorkflowStepHandler): void {
    this._steps.set(id, handler);
  }

  async startAt(stepId: string): Promise<void> {
    this._currentStepId = stepId;
    this.emitExpression("workflow.step", { step: stepId });
    await this._run(stepId);
  }

  async next(stepId: string): Promise<void> {
    this._currentStepId = stepId;
    this.emitExpression("workflow.step", { step: stepId });
    await this._run(stepId);
  }

  failStep(code: string, message?: string): void {
    this.emitExpression("workflow.error", {
      step: this._currentStepId,
      code,
      ...(message != null ? { message } : {}),
    });
  }

  completeWorkflow(payload?: unknown): void {
    this.emitExpression("workflow.done", payload ?? { flow: this.id, step: this._currentStepId });
  }

  private async _run(stepId: string): Promise<void> {
    const handler = this._steps.get(stepId);
    if (!handler) {
      this.failStep("workflow.step.not_found", `Step "${stepId}" is not registered.`);
      return;
    }
    try {
      await Promise.resolve(handler());
    } catch (e) {
      this.failStep("workflow.step.exception", e instanceof Error ? e.message : String(e));
    }
  }
}
