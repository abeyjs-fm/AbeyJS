import { omegaWireNameFromCamelCaseEnumMember } from "./omega-semantics-wire-from-camel.js";

/**
 * Typed event naming: keep wire strings honest and refactor-friendly.
 * Feed the result into `omegaEventFromName(...)` when building `OmegaEvent` instances.
 *
 * Three practical shapes:
 *
 * 1. **Literal** — `{ name: "auth.login.success" }` or any object with a `name` field.
 * 2. **Dotted camel** — {@link omegaEventNameDottedCamel} breaks camelCase into lowercase segments
 *    (`authLoginSuccess` → `"auth.login.success"`). Default for large semantics tables.
 * 3. **Wire-as-identifier** — {@link omegaEventNameEnumWire} keeps the member string verbatim (no dots).
 *
 * Pass the **member string** into the helpers (const map key, string enum value, etc.).
 *
 * @example Dotted camel
 * ```ts
 * const ev = omegaEventNameDottedCamel("navigationIntent"); // → "navigation.intent"
 * channel.emit(omegaEventFromName(ev, { payload: data }));
 * ```
 *
 * @example Wire equals identifier
 * ```ts
 * const ev = omegaEventNameEnumWire("authLoginSuccess"); // → "authLoginSuccess"
 * ```
 */
export interface OmegaEventName {
  readonly name: string;
}

/**
 * @param enumMemberName CamelCase case name, e.g. the literal `"authLoginSuccess"`.
 */
export function omegaEventNameDottedCamel(enumMemberName: string): OmegaEventName {
  return {
    name: omegaWireNameFromCamelCaseEnumMember(enumMemberName),
  };
}
export function omegaEventNameEnumWire(enumMemberName: string): OmegaEventName {
  return { name: enumMemberName };
}
