import { omegaWireNameFromCamelCaseEnumMember } from "./omega-semantics-wire-from-camel.js";

/**
 * Typed intent naming: pick dotted camel breakage or pass-through wire strings.
 * Mirrors {@link OmegaEventName}: legacy literal, dotted camel case, or wire-as-identifier.
 *
 * Use {@link omegaIntentNameDottedCamel} / {@link omegaIntentNameEnumWire} with the chosen member **string**.
 *
 * @example
 * ```ts
 * omegaIntentNameDottedCamel("navigateLogin"); // → "navigate.login"
 * omegaIntentNameEnumWire("demoCounterIncrement"); // → "demoCounterIncrement"
 * ```
 */
export interface OmegaIntentName {
  readonly name: string;
}

/** `camelCaseMember` → dotted wire (`navigate.login`). */
export function omegaIntentNameDottedCamel(enumMemberName: string): OmegaIntentName {
  return {
    name: omegaWireNameFromCamelCaseEnumMember(enumMemberName),
  };
}

/** Wire name equals the member identifier unchanged. */
export function omegaIntentNameEnumWire(enumMemberName: string): OmegaIntentName {
  return { name: enumMemberName };
}
