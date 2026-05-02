export function getRole<T extends HTMLElement = HTMLElement>(root: ParentNode, role: string): T {
  const el = root.querySelector(`[data-role="${CSS.escape(role)}"]`);
  if (!el) {
    throw new Error(`AbeyJs view: missing data-role="${role}"`);
  }
  return el as T;
}

export function tryGetRole<T extends HTMLElement = HTMLElement>(root: ParentNode, role: string): T | null {
  return root.querySelector(`[data-role="${CSS.escape(role)}"]`) as T | null;
}

