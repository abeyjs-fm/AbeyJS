/**
 * Turns camelCase member labels into lowercase dotted wires (`ordersCreate` → `orders.create`).
 */
export function omegaWireNameFromCamelCaseEnumMember(enumMemberName: string): string {
  if (enumMemberName.length === 0) {
    return enumMemberName;
  }
  const dotted = enumMemberName.replace(/([a-z0-9])([A-Z])/g, (_, a: string, b: string) => `${a}.${b}`);
  return dotted.toLowerCase();
}
