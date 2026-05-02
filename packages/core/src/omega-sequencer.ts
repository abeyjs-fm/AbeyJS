/**
 * Monotonic prefixed ids (`ev:1`, `intent:2`, …)—handy for logs and ordered tooling.
 * Intents/events still correlate via {@link createCorrelationId}; sequencing answers a different need.
 */
let _omegaSeq = 0;

export function omegaNextSequencedId(prefix: string): string {
  return `${prefix}${++_omegaSeq}`;
}
