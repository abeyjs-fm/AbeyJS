/** Message a flow sends to the UI (loading, success, error). UI subscribes via {@link OmegaFlow.subscribeExpressions}. */
export class OmegaFlowExpression {
  constructor(
    readonly type: string,
    readonly payload?: unknown,
  ) {}
}

export function omegaFlowExpressionPayloadAs<T>(exp: OmegaFlowExpression): T | null {
  const { payload } = exp;
  if (payload === undefined || payload === null) {
    return null;
  }
  return payload as T;
}
