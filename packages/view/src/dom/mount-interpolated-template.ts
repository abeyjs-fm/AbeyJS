export type InterpolationValue = string | number | boolean | null | undefined;

export type InterpolationBinding =
  | InterpolationValue
  | (() => InterpolationValue);

export type InterpolationBindings = Record<string, InterpolationBinding>;

type Segment =
  | { kind: "text"; value: string }
  | { kind: "token"; key: string };

function parseSegments(input: string): Segment[] {
  const out: Segment[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  let last = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const m = re.exec(input);
    if (!m) {
      break;
    }
    const start = m.index;
    if (start > last) {
      out.push({ kind: "text", value: input.slice(last, start) });
    }
    out.push({ kind: "token", key: m[1]! });
    last = start + m[0].length;
  }
  if (last < input.length) {
    out.push({ kind: "text", value: input.slice(last) });
  }
  return out;
}

function resolveBinding(b: InterpolationBinding | undefined): InterpolationValue {
  if (typeof b === "function") {
    return (b as () => InterpolationValue)();
  }
  return b;
}

function normalizeValue(v: InterpolationValue): string {
  if (v == null) {
    return "";
  }
  return typeof v === "string" ? v : String(v);
}

/** Valor tipo `[a, b]` o `a, b` → nombres de token de `bindings`. */
function parseAbeyClassListSpec(raw: string): string[] {
  let s = raw.trim();
  if (s.startsWith("[") && s.endsWith("]")) {
    s = s.slice(1, -1).trim();
  }
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export type MountedInterpolatedTemplate = {
  /** Re-evaluates bindings and updates text nodes. */
  render: () => void;
  /** Clears outlet and releases references. */
  dispose: () => void;
};

/**
 * Very small interpolation engine: replaces `{{token}}` occurrences in text nodes with reactive text nodes.
 *
 * This is intentionally minimal: it does not evaluate expressions, only token lookups in `bindings`.
 *
 * **Clases:** atributo `[abeyclass]` o `abeyclass` con valor tipo `[banner.a, banner.b]` o `banner.a, banner.b`
 * (solo nombres de token en `bindings`). Se unen las clases no vacías a `class` estática. No combinar
 * con `class="{{…}}"` (solo `class` fija).
 */
export function mountInterpolatedTemplate(
  outlet: HTMLElement,
  html: string,
  bindings: InterpolationBindings,
): MountedInterpolatedTemplate {
  outlet.innerHTML = html;

  const updates: Array<() => void> = [];

  const evalSegments = (segments: Segment[]): string => {
    let out = "";
    for (const seg of segments) {
      if (seg.kind === "text") out += seg.value;
      else out += normalizeValue(resolveBinding(bindings[seg.key]));
    }
    return out;
  };
  const walker = document.createTreeWalker(outlet, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  // Collect first to avoid walker confusion while mutating DOM.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = walker.nextNode();
    if (!n) break;
    if (n.nodeType === Node.TEXT_NODE) {
      textNodes.push(n as Text);
    }
  }

  for (const textNode of textNodes) {
    const raw = textNode.nodeValue ?? "";
    if (!raw.includes("{{")) {
      continue;
    }
    const segments = parseSegments(raw);
    if (segments.every((s) => s.kind === "text")) {
      continue;
    }
    const frag = document.createDocumentFragment();
    for (const seg of segments) {
      if (seg.kind === "text") {
        frag.appendChild(document.createTextNode(seg.value));
        continue;
      }
      const tn = document.createTextNode("");
      frag.appendChild(tn);
      updates.push(() => {
        const v = normalizeValue(resolveBinding(bindings[seg.key]));
        if (tn.nodeValue !== v) {
          tn.nodeValue = v;
        }
      });
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  // Attribute interpolation: replaces `{{token}}` inside attribute values.
  const elWalker = document.createTreeWalker(outlet, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = elWalker.nextNode();
    if (!n) break;
    if (n.nodeType === Node.ELEMENT_NODE) elements.push(n as Element);
  }

  for (const node of elements) {
    for (const attr of Array.from(node.attributes)) {
      const raw = attr.value ?? "";
      if (!raw.includes("{{")) continue;
      const segments = parseSegments(raw);
      if (segments.every((s) => s.kind === "text")) continue;
      const name = attr.name;
      updates.push(() => {
        const v = evalSegments(segments);
        if (!v) {
          if (node.hasAttribute(name)) node.removeAttribute(name);
          return;
        }
        if (node.getAttribute(name) !== v) node.setAttribute(name, v);
      });
    }
  }

  for (const node of elements) {
    const abey = Array.from(node.attributes).find(
      (a) => a.name.toLowerCase() === "[abeyclass]" || a.name.toLowerCase() === "abeyclass",
    );
    if (!abey) {
      continue;
    }
    const classRaw = node.getAttribute("class") ?? "";
    if (classRaw.includes("{{")) {
      console.warn("[mountInterpolatedTemplate] [abeyclass] omitido: `class` no debe contener {{…}}.");
      node.removeAttribute(abey.name);
      continue;
    }
    const staticClass = classRaw.trim();
    const tokens = parseAbeyClassListSpec(abey.value ?? "");
    node.removeAttribute(abey.name);
    if (tokens.length === 0) {
      continue;
    }
    updates.push(() => {
      const dynamic = tokens
        .map((key) => normalizeValue(resolveBinding(bindings[key])))
        .filter(Boolean)
        .join(" ")
        .trim();
      const merged = [staticClass, dynamic].filter(Boolean).join(" ").trim();
      if (merged) {
        node.setAttribute("class", merged);
      } else {
        node.removeAttribute("class");
      }
    });
  }

  const render = (): void => {
    for (const u of updates) {
      u();
    }
  };
  render();

  return {
    render,
    dispose: () => {
      outlet.textContent = "";
      updates.length = 0;
    },
  };
}

