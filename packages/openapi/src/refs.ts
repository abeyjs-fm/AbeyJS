/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
const refKey = (s: string): [string, string] | null => {
  if (!s?.startsWith("#/components/")) {
    return null;
  }
  const rest = s.replace("#/components/", "");
  if (rest.startsWith("schemas/")) {
    return ["schemas", rest.replace("schemas/", "")];
  }
  return null;
};

export function resolveSchemaRef(
  spec: { components?: { schemas?: Record<string, unknown> } | undefined } | any,
  ref: string,
): unknown | null {
  const p = refKey(ref);
  if (!p) {
    return null;
  }
  const [_, name] = p;
  return spec?.components?.schemas?.[name] ?? null;
}

export function derefNode(spec: { components?: { schemas?: Record<string, unknown> } } | any, n: any): any {
  if (n?.$ref) {
    return resolveSchemaRef(spec, n.$ref) ?? n;
  }
  return n;
}
