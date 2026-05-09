export function entityToFormValues(
  entity: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const raw = entity[key];
    if (typeof defaults[key] === "boolean") {
      out[key] = Boolean(raw);
      continue;
    }
    out[key] = raw ?? defaults[key];
  }
  return out;
}
