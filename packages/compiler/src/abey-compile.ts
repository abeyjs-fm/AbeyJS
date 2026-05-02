/** Frontmatter body + remainder after the closing `---` delimiter. */
export type AbeyParseResult = {
  frontmatter: string;
  template: string;
};

/** Emitted TypeScript module text. `map` is reserved for future first-class source maps from this package. */
export type CompileAbeyResult = {
  code: string;
  map?: any;
};

import * as parse5 from "parse5";

/**
 * ## Role
 * Transforms `*.view.html` / `*.abey` markup into a **single ES module** exporting `template`, `compiledTemplate`,
 * `mount(outlet, ctx)`, and optionally a custom element class when frontmatter declares `@Component({ ... })`.
 *
 * ## Compilation order (keep in sync with `compileAbeyToTs`)
 * 1. **Frontmatter** — `splitFrontmatter` (`---` blocks). `parseComponentMeta` reads `@Component` for selector, `styles[]`,
 *    optional `state:`, and `aot` flag.
 * 2. **Sugar** — `preprocessSugar` (`*if`, `*for`, `@switch` lowering).
 * 3. **Attributes** — mixed `{{ }}` in strings, then exact `attr="{{ expr }}"`, then **`<select [items]>`** (must run
 *    before generic `[prop]` extraction), then bracket bindings `[prop]`, `(event)`, `[(model)]`, etc.
 * 4. **Control flow** — `extractIfBlocks`, `extractForBlocks` (nested `@for` under `@if` merge into `allForBlocks`).
 * 5. **Text holes** — `extractHoles` for `{{ expr }}` / `{expr}` in text nodes only.
 * 6. **Emit** — escaped template literals, generated `render` loop (outer→inner `if`/`for` ordering), runtime helpers.
 *    **AOT path** — if frontmatter `@Component` sets `aot: true` (the default) and `buildAotFactory` accepts the HTML
 *    (no `data-abey-if` / `data-abey-for` templates), `mount` uses imperative DOM creation; otherwise it clones from
 *    `compiledTemplate` via `innerHTML`. Optional **custom element** shell still wraps `mount` when `@Component` is present.
 *
 * Expressions are **opaque strings** evaluated in the generated `mount()` closure against `ctx`; there is no AST typecheck yet.
 */

type ComponentCompileMeta = {
  selector: string;
  styles: string[];
  aot: boolean;
  stateExpr: string | null;
  frontmatterRest: string;
} | null;

function splitFrontmatter(source: string): AbeyParseResult {
  // Expect:
  // ---\n
  // <frontmatter>\n
  // ---\n
  // <template>
  const m = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!m) {
    return { frontmatter: "", template: source };
  }
  return { frontmatter: m[1] ?? "", template: m[2] ?? "" };
}

function escapeForTemplateLiteral(s: string): string {
  return s.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${");
}

function indentLines(s: string, spaces: number): string {
  const pad = " ".repeat(Math.max(0, spaces | 0));
  return String(s ?? "")
    .split(/\r?\n/g)
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

function pascalFromKebab(sel: string): string {
  const s = String(sel ?? "").trim();
  const base = s.replace(/^[^a-zA-Z]+/, "").replace(/[^a-zA-Z0-9-]+/g, "-");
  const parts = base.split("-").filter(Boolean);
  const p = parts.map((x) => x.slice(0, 1).toUpperCase() + x.slice(1)).join("");
  return p || "AbeyView";
}

function parseComponentMeta(frontmatter: string): ComponentCompileMeta {
  const fm = String(frontmatter ?? "");
  const at = fm.indexOf("@Component");
  if (at === -1) return null;
  let p = at + "@Component".length;
  while (p < fm.length && /\s/.test(fm[p]!)) p++;
  if (fm[p] !== "(") return null;
  const parenStart = p;
  const parenEnd = scanBalanced(fm, parenStart, "(", ")");
  if (parenEnd === null) return null;
  const inside = fm.slice(parenStart + 1, parenEnd).trim();
  // Expect `{ ... }`
  const braceStart = inside.indexOf("{");
  if (braceStart === -1) return null;
  const braceEnd = scanBalanced(inside, braceStart, "{", "}");
  if (braceEnd === null) return null;
  const obj = inside.slice(braceStart + 1, braceEnd);
  const selM = obj.match(/selector\s*:\s*(["'])(.*?)\1/m);
  const selector = selM ? String(selM[2] ?? "").trim() : "";
  if (!selector) return null;

  const styles: string[] = [];
  const stylesM = obj.match(/styles\s*:\s*\[([\s\S]*?)\]/m);
  if (stylesM) {
    const inner = stylesM[1] ?? "";
    const re = /(["'])(.*?)\1/g;
    for (let mm = re.exec(inner); mm; mm = re.exec(inner)) {
      const p = String(mm[2] ?? "").trim();
      if (p) styles.push(p);
    }
  }

  // Parse `state: <expr>` using a small scanner (supports object literal with nested braces).
  const readStateExpr = (): string | null => {
    const k = obj.indexOf("state");
    if (k === -1) return null;
    // ensure it's a key (best-effort): `state` followed by optional spaces and `:`
    let p = k + "state".length;
    while (p < obj.length && /\s/.test(obj[p]!)) p++;
    if (obj[p] !== ":") return null;
    p++;
    while (p < obj.length && /\s/.test(obj[p]!)) p++;
    if (p >= obj.length) return null;
    const start = p;
    const ch = obj[start]!;
    // If object literal, scan balanced braces.
    if (ch === "{") {
      const end = scanBalanced(obj, start, "{", "}");
      if (end === null) return null;
      return obj.slice(start, end + 1).trim();
    }
    // Otherwise read until next top-level comma.
    let i = start;
    let quote: "'" | '"' | null = null;
    let par = 0;
    let br = 0;
    let cr = 0;
    while (i < obj.length) {
      const c = obj[i]!;
      if (quote) {
        if (c === "\\" && i + 1 < obj.length) {
          i += 2;
          continue;
        }
        if (c === quote) quote = null;
        i++;
        continue;
      }
      if (c === "'" || c === '"') {
        quote = c as any;
        i++;
        continue;
      }
      if (c === "(") par++;
      else if (c === ")") par = Math.max(0, par - 1);
      else if (c === "[") br++;
      else if (c === "]") br = Math.max(0, br - 1);
      else if (c === "{") cr++;
      else if (c === "}") cr = Math.max(0, cr - 1);
      else if (c === "," && par === 0 && br === 0 && cr === 0) break;
      i++;
    }
    return obj.slice(start, i).trim() || null;
  };

  const stateExpr = readStateExpr();

  const aotM = obj.match(/\baot\s*:\s*(true|false)\b/m);
  // Default ON: AOT is used when template is eligible (no control-flow blocks).
  const aot = aotM ? aotM[1] === "true" : true;

  const frontmatterRest = (fm.slice(0, at) + fm.slice(parenEnd + 1)).trim();
  return { selector, styles, aot, stateExpr: stateExpr && stateExpr.length ? stateExpr : null, frontmatterRest };
}

type ExprHole = { index: number; expr: string };

type AttrHole = { index: number; attrName: string; expr: string };
type PropHole = { index: number; propName: string; expr: string };
type ClassHole = { index: number; className: string; expr: string };
type EventHole = { index: number; eventName: string; handlerExpr: string };
type StyleHole = { index: number; styleProp: string; unit: string | null; expr: string };
type StyleMapHole = { index: number; expr: string };
type ClassMapHole = { index: number; expr: string };

type AttrMixPart = { t: "text"; v: string } | { t: "expr"; v: string };
type AttrMixHole = { index: number; attrName: string; parts: AttrMixPart[] };

type SelectItemsDirective = {
  index: number;
  itemsExpr: string;
  valueKey: string;
  labelKey: string;
};

type ForBlock = {
  index: number;
  itemVar: string;
  listExpr: string;
  bodyHtml: string;
  bodyHoles: ExprHole[];
};

type IfBlock = {
  index: number;
  testExpr: string;
  thenHtml: string;
  thenHoles: ExprHole[];
  elseHtml: string | null;
  elseHoles: ExprHole[];
};

type Counters = { forIndex: number; ifIndex: number; holeIndex: number };

/**
 * Preprocess sugar syntax before the main compiler passes.
 *
 * Supported (MVP):
 * - `*if="expr"` on an element → `@if (expr) { <el ...>...</el> }`
 * - `*for="item of expr"` (or `let item of expr`) on an element → `@for (item of expr) { <el ...>...</el> }`
 * - `@switch (expr) { @case (x) { ... } @default { ... } }` → `@if/@else if/@else`
 *
 * Notes:
 * - This is a best-effort string transform (not a full HTML parser).
 * - It expects `*if/*for` on non-self-closing tags with a closing tag.
 */
function preprocessSugar(input: string): string {
  let s = input;

  // 1) @switch blocks → @if chain
  const transformSwitchOnce = (): boolean => {
    const idx = s.indexOf("@switch");
    if (idx === -1) return false;
    let p = idx + 7;
    while (p < s.length && /\s/.test(s[p]!)) p++;
    if (s[p] !== "(") return false;
    const parenEnd = scanBalanced(s, p, "(", ")");
    if (parenEnd === null) return false;
    const switchExpr = s.slice(p + 1, parenEnd).trim();
    p = parenEnd + 1;
    while (p < s.length && /\s/.test(s[p]!)) p++;
    if (s[p] !== "{") return false;
    const blockEnd = scanBalanced(s, p, "{", "}");
    if (blockEnd === null) return false;
    const body = s.slice(p + 1, blockEnd);

    type Case = { test: string; html: string };
    const cases: Case[] = [];
    let defHtml: string | null = null;
    let bi = 0;
    const eatWs = (): void => {
      while (bi < body.length && /\s/.test(body[bi]!)) bi++;
    };
    while (bi < body.length) {
      eatWs();
      if (body.slice(bi, bi + 5) === "@case") {
        bi += 5;
        eatWs();
        if (body[bi] !== "(") break;
        const pe = scanBalanced(body, bi, "(", ")");
        if (pe === null) break;
        const caseExpr = body.slice(bi + 1, pe).trim();
        bi = pe + 1;
        eatWs();
        if (body[bi] !== "{") break;
        const be = scanBalanced(body, bi, "{", "}");
        if (be === null) break;
        const raw = body.slice(bi + 1, be);
        cases.push({ test: `(${switchExpr}) === (${caseExpr})`, html: raw });
        bi = be + 1;
        continue;
      }
      if (body.slice(bi, bi + 8) === "@default") {
        bi += 8;
        eatWs();
        if (body[bi] !== "{") break;
        const be = scanBalanced(body, bi, "{", "}");
        if (be === null) break;
        defHtml = body.slice(bi + 1, be);
        bi = be + 1;
        continue;
      }
      // unknown token: stop
      break;
    }

    let out = "";
    if (cases.length) {
      out += `@if (${cases[0]!.test}) {${cases[0]!.html}}`;
      for (let ci = 1; ci < cases.length; ci++) {
        out += ` @else if (${cases[ci]!.test}) {${cases[ci]!.html}}`;
      }
      if (defHtml != null) {
        out += ` @else {${defHtml}}`;
      }
    } else if (defHtml != null) {
      out = defHtml;
    }

    s = s.slice(0, idx) + out + s.slice(blockEnd + 1);
    return true;
  };
  // apply repeatedly (in case of multiple switch blocks)
  for (let guard = 0; guard < 20; guard++) {
    if (!s.includes("@switch")) break;
    if (!transformSwitchOnce()) break;
  }

  // 2) *if / *for on elements
  const findTagStart = (from: number): number => s.indexOf("<", from);
  const matchOpenTag = (pos: number): { tag: string; end: number; text: string } | null => {
    if (s[pos] !== "<") return null;
    if (s[pos + 1] === "/" || s[pos + 1] === "!" || s[pos + 1] === "?") return null;
    const gt = s.indexOf(">", pos);
    if (gt === -1) return null;
    const text = s.slice(pos, gt + 1);
    const m = text.match(/^<\s*([a-zA-Z][\w:-]*)\b/);
    if (!m) return null;
    return { tag: m[1]!, end: gt + 1, text };
  };
  const findClosingTag = (tag: string, from: number): number | null => {
    const close = `</${tag}`;
    let depth = 1;
    let i = from;
    while (i < s.length) {
      const nextOpen = s.indexOf("<" + tag, i);
      const nextClose = s.indexOf(close, i);
      if (nextClose === -1) return null;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + 1;
        continue;
      }
      depth--;
      if (depth === 0) {
        const gt = s.indexOf(">", nextClose);
        return gt === -1 ? null : gt + 1;
      }
      i = nextClose + 1;
    }
    return null;
  };

  let out = "";
  let i = 0;
  while (i < s.length) {
    const lt = findTagStart(i);
    if (lt === -1) {
      out += s.slice(i);
      break;
    }
    out += s.slice(i, lt);
    const open = matchOpenTag(lt);
    if (!open) {
      out += s[lt]!;
      i = lt + 1;
      continue;
    }

    const hasIf = /\s\*if\s*=\s*(["'])([\s\S]*?)\1/.test(open.text);
    const hasFor = /\s\*for\s*=\s*(["'])([\s\S]*?)\1/.test(open.text);
    if (!hasIf && !hasFor) {
      out += open.text;
      i = open.end;
      continue;
    }

    // capture exprs and remove attributes
    const ifM = open.text.match(/\s\*if\s*=\s*(["'])([\s\S]*?)\1/);
    const forM = open.text.match(/\s\*for\s*=\s*(["'])([\s\S]*?)\1/);
    const ifExpr = ifM ? String(ifM[2] ?? "").trim() : null;
    const forExprRaw = forM ? String(forM[2] ?? "").trim() : null;

    const closeEnd = findClosingTag(open.tag, open.end);
    if (!closeEnd) {
      out += open.text;
      i = open.end;
      continue;
    }
    const block = s.slice(lt, closeEnd);

    // remove *if/*for attributes from the opening tag only
    const cleaned = block.replace(/\s\*if\s*=\s*(["'])([\s\S]*?)\1/, "").replace(/\s\*for\s*=\s*(["'])([\s\S]*?)\1/, "");

    let wrapped = cleaned;
    if (forExprRaw) {
      const norm = forExprRaw.replace(/^let\s+/, "");
      const m = norm.match(/^([a-zA-Z_$][\w$]*)\s+of\s+([\s\S]+)$/);
      if (m) {
        wrapped = `@for (${m[1]} of ${m[2].trim()}) {${wrapped}}`;
      }
    }
    if (ifExpr) {
      wrapped = `@if (${ifExpr}) {${wrapped}}`;
    }
    out += wrapped;
    i = closeEnd;
  }

  return out;
}

type AotBuild = {
  createCode: string;
  rootAppendCode: string;
  // Prefill maps for bindings (no scan).
  bindCode: string;
};

function buildAotFactory(html: string): AotBuild | null {
  // AOT MVP: reject control-flow templates (we still support them in non-AOT mount).
  if (html.includes("template data-abey-for") || html.includes("template data-abey-if")) return null;
  const frag = parse5.parseFragment(html) as any;
  let elSeq = 0;
  let txtSeq = 0;
  const lines: string[] = [];
  const bind: string[] = [];
  const mkEl = (): string => `__el${elSeq++}`;
  const mkTxt = (): string => `__tx${txtSeq++}`;

  const esc = (v: string): string => JSON.stringify(v);

  const walk = (node: any, parentVar: string): void => {
    if (!node) return;
    if (node.nodeName === "#text") {
      const v = String(node.value ?? "");
      if (!v) return;
      const tv = mkTxt();
      lines.push(`const ${tv} = document.createTextNode(${esc(v)});`);
      lines.push(`${parentVar}.appendChild(${tv});`);
      return;
    }
    if (node.nodeName === "#comment") {
      return;
    }
    if (node.tagName) {
      const ev = mkEl();
      lines.push(`const ${ev} = document.createElement(${esc(String(node.tagName))});`);
      const attrs: any[] = Array.isArray(node.attrs) ? node.attrs : [];
      for (const a of attrs) {
        const n = String(a.name ?? "");
        const v = String(a.value ?? "");
        if (!n) continue;
        lines.push(`${ev}.setAttribute(${esc(n)}, ${esc(v)});`);

        // Binding markers
        if (n === "data-abey-hole") {
          const idx = Number(v);
          if (Number.isFinite(idx)) bind.push(`holeEls.set(${idx}, ${ev} as any);`);
        } else if (n.startsWith("data-abey-attr-")) {
          const idx = Number(n.slice("data-abey-attr-".length));
          if (Number.isFinite(idx)) bind.push(`attrEls.set(${idx}, { el: ${ev} as any, attr: ${esc(v)} });`);
        } else if (n.startsWith("data-abey-attrmix-")) {
          const idx = Number(n.slice("data-abey-attrmix-".length));
          if (Number.isFinite(idx)) bind.push(`attrMixEls.set(${idx}, { el: ${ev} as any, attr: ${esc(v)} });`);
        } else if (n.startsWith("data-abey-prop-")) {
          const idx = Number(n.slice("data-abey-prop-".length));
          if (Number.isFinite(idx)) bind.push(`propEls.set(${idx}, { el: ${ev} as any, prop: ${esc(v)} });`);
        } else if (n.startsWith("data-abey-class-")) {
          const idx = Number(n.slice("data-abey-class-".length));
          if (Number.isFinite(idx)) bind.push(`classEls.set(${idx}, { el: ${ev} as any, cls: ${esc(v)} });`);
        } else if (n.startsWith("data-abey-on-")) {
          const idx = Number(n.slice("data-abey-on-".length));
          if (Number.isFinite(idx)) bind.push(`onEls.set(${idx}, { el: ${ev} as any, ev: ${esc(v)} });`);
        } else if (n.startsWith("data-abey-style-")) {
          const idx = Number(n.slice("data-abey-style-".length));
          if (Number.isFinite(idx)) bind.push(`styleEls.set(${idx}, { el: ${ev} as any, prop: ${esc(v)} });`);
        } else if (n.startsWith("data-abey-stylemap-")) {
          const idx = Number(n.slice("data-abey-stylemap-".length));
          if (Number.isFinite(idx)) bind.push(`styleMapEls.set(${idx}, ${ev} as any);`);
        } else if (n.startsWith("data-abey-classmap-")) {
          const idx = Number(n.slice("data-abey-classmap-".length));
          if (Number.isFinite(idx)) {
            bind.push(`classMapEls.set(${idx}, ${ev} as any);`);
            bind.push(`classMapBase.set(${idx}, String((${ev} as any).className ?? ""));`);
          }
        } else if (n === "data-abey-select-items") {
          const idx = Number(v);
          if (Number.isFinite(idx)) {
            bind.push(`selectEls.set(${idx}, ${ev} as any);`);
            bind.push(`{ const ph = (${ev} as any).querySelector('option[value=\"\"]'); selectPlaceholders.set(${idx}, (ph ? (ph.cloneNode(true) as any) : null)); }`);
          }
        }
      }
      lines.push(`${parentVar}.appendChild(${ev});`);
      const kids: any[] = Array.isArray(node.childNodes) ? node.childNodes : [];
      for (const k of kids) walk(k, ev);
    }
  };

  lines.push(`const __frag = document.createDocumentFragment();`);
  const kids: any[] = Array.isArray(frag.childNodes) ? frag.childNodes : [];
  for (const k of kids) walk(k, "__frag");
  const rootAppendCode = `outlet.textContent = ""; outlet.appendChild(__frag);`;
  return { createCode: lines.join("\n"), rootAppendCode, bindCode: bind.join("\n") };
}

/**
 * Extract attribute bindings of the form: `attr="{{ expr }}"` (exact value).
 *
 * Rewrites:
 *   intentload="{{ intentLoad }}"
 * into:
 *   intentload="" data-abey-attr-12="intentload"
 *
 * Then render() can set `el.setAttribute(attrName, String(expr))`.
 *
 * MVP: only supports exact `{{ ... }}` values (no mixed text).
 */
function extractAttrHoles(template: string, counters: Counters): { html: string; attrHoles: AttrHole[] } {
  const attrHoles: AttrHole[] = [];
  // Attribute name: allow letters/digits/_/:- (HTML-ish).
  const re = /(\s)([a-zA-Z_:][\w:.-]*)\s*=\s*(["'])\s*\{\{\s*([\s\S]*?)\s*\}\}\s*\3/g;
  const html = template.replace(re, (_m, ws: string, attrName: string, quote: string, rawExpr: string) => {
    const expr = String(rawExpr ?? "").trim();
    if (!expr) return _m;
    const idx = counters.holeIndex++;
    attrHoles.push({ index: idx, attrName, expr });
    // Keep the original attribute but empty; add marker attribute.
    return `${ws}${attrName}=${quote}${quote} data-abey-attr-${idx}=${quote}${attrName}${quote}`;
  });
  return { html, attrHoles };
}

/**
 * Extract bracket-style declarative bindings on opening tags (compiled template only):
 * - `[prop]="expr"` or `[attr.x]="expr"` or `[class.foo]="expr"`
 * - `(click)="handler($event)"`
 * - `[(model)]="state.x"` (sugar → value/checked + input/change)
 *
 * We rewrite them into valid marker attributes:
 * - data-abey-prop-<idx>="propName"
 * - data-abey-attr-<idx>="attrName"   (reuses attr hole infra)
 * - data-abey-class-<idx>="className"
 * - data-abey-on-<idx>="eventName"
 *
 * MVP: bindings must be inside a single tag; we keep original spacing.
 */
function extractBracketBindings(
  template: string,
  counters: Counters,
): {
  html: string;
  propHoles: PropHole[];
  classHoles: ClassHole[];
  attrHoles: AttrHole[];
  eventHoles: EventHole[];
  styleHoles: StyleHole[];
  styleMapHoles: StyleMapHole[];
  classMapHoles: ClassMapHole[];
} {
  const propHoles: PropHole[] = [];
  const classHoles: ClassHole[] = [];
  const attrHoles: AttrHole[] = [];
  const eventHoles: EventHole[] = [];
  const styleHoles: StyleHole[] = [];
  const styleMapHoles: StyleMapHole[] = [];
  const classMapHoles: ClassMapHole[] = [];

  const addProp = (propName: string, expr: string, ws: string, quote: string): string => {
    const idx = counters.holeIndex++;
    propHoles.push({ index: idx, propName, expr });
    return `${ws}data-abey-prop-${idx}=${quote}${propName}${quote}`;
  };
  const addClass = (className: string, expr: string, ws: string, quote: string): string => {
    const idx = counters.holeIndex++;
    classHoles.push({ index: idx, className, expr });
    return `${ws}data-abey-class-${idx}=${quote}${className}${quote}`;
  };
  const addAttr = (attrName: string, expr: string, ws: string, quote: string): string => {
    const idx = counters.holeIndex++;
    attrHoles.push({ index: idx, attrName, expr });
    return `${ws}data-abey-attr-${idx}=${quote}${attrName}${quote}`;
  };
  const addOn = (eventName: string, handlerExpr: string, ws: string, quote: string): string => {
    const idx = counters.holeIndex++;
    eventHoles.push({ index: idx, eventName, handlerExpr });
    return `${ws}data-abey-on-${idx}=${quote}${eventName}${quote}`;
  };

  const addStyle = (styleProp: string, unit: string | null, expr: string, ws: string, quote: string): string => {
    const idx = counters.holeIndex++;
    styleHoles.push({ index: idx, styleProp, unit, expr });
    return `${ws}data-abey-style-${idx}=${quote}${styleProp}${quote}`;
  };
  const addStyleMap = (expr: string, ws: string, quote: string): string => {
    const idx = counters.holeIndex++;
    styleMapHoles.push({ index: idx, expr });
    return `${ws}data-abey-stylemap-${idx}=${quote}1${quote}`;
  };
  const addClassMap = (expr: string, ws: string, quote: string): string => {
    const idx = counters.holeIndex++;
    classMapHoles.push({ index: idx, expr });
    return `${ws}data-abey-classmap-${idx}=${quote}1${quote}`;
  };

  const sniffTagContext = (full: string, offset: number): { tagName: string | null; inputType: string | null } => {
    // Best-effort: find nearest `<` before offset and `>` after offset.
    const lt = full.lastIndexOf("<", offset);
    if (lt < 0) return { tagName: null, inputType: null };
    const gt = full.indexOf(">", offset);
    if (gt < 0) return { tagName: null, inputType: null };
    const chunk = full.slice(lt, gt + 1);
    const tagMatch = chunk.match(/^<\s*([a-zA-Z][\w:-]*)/);
    const tagName = tagMatch ? tagMatch[1]!.toLowerCase() : null;
    // Only relevant for <input>
    const typeMatch = chunk.match(/\btype\s*=\s*(["'])(.*?)\1/i);
    const inputType = typeMatch ? String(typeMatch[2] ?? "").trim().toLowerCase() : null;
    return { tagName, inputType };
  };

  // Two-way: [(model)]="expr"
  const reTwoWay = /(\s)\[\(\s*([a-zA-Z_$][\w$]*)\s*\)\]\s*=\s*(["'])([\s\S]*?)\3/g;
  // One-way props/attr/class/style: [x]="expr"
  const reProp = /(\s)\[\s*([a-zA-Z_$][\w$.-]*)\s*\]\s*=\s*(["'])([\s\S]*?)\3/g;
  // Attr: [attr.name]="expr"
  const reAttr = /(\s)\[\s*attr\.([a-zA-Z_:][\w:.-]*)\s*\]\s*=\s*(["'])([\s\S]*?)\3/g;
  // Class: [class.foo]="expr"
  const reClass = /(\s)\[\s*class\.([a-zA-Z_-][\w-]*)\s*\]\s*=\s*(["'])([\s\S]*?)\3/g;
  // Style: [style.width.px]="expr" or [style.width]="expr"
  const reStyle = /(\s)\[\s*style\.([a-zA-Z_-][\w-]*)(?:\.([a-zA-Z_-][\w-]*))?\s*\]\s*=\s*(["'])([\s\S]*?)\4/g;
  // Style map: [style]="obj"
  const reStyleMap = /(\s)\[\s*style\s*\]\s*=\s*(["'])([\s\S]*?)\2/g;
  // Class map: [class]="obj"
  const reClassMap = /(\s)\[\s*class\s*\]\s*=\s*(["'])([\s\S]*?)\2/g;
  // Events: (click)="expr"
  const reOn = /(\s)\(\s*([a-zA-Z_$][\w$:-]*)\s*\)\s*=\s*(["'])([\s\S]*?)\3/g;

  // Apply in safe order: twoWay → attr/class → prop → events.
  let html = template.replace(reTwoWay, (_m, ws: string, modelName: string, quote: string, rawExpr: string, offset: number, full: string) => {
    const expr = String(rawExpr ?? "").trim();
    const key = String(modelName ?? "").trim();
    if (!expr || !key) return _m;

    const { tagName, inputType } = sniffTagContext(full, offset);
    const lowerKey = key.toLowerCase();

    // Explicit two-way on checked/value still supported: [(checked)] / [(value)]
    if (lowerKey === "checked") {
      const p = addProp("checked", expr, ws, quote);
      const h = addOn("change", `${expr} = (($event.target as any)?.checked)`, " ", quote);
      return `${p}${h}`;
    }
    if (lowerKey === "value") {
      const p = addProp("value", expr, ws, quote);
      const h = addOn("input", `${expr} = (($event.target as any)?.value)`, " ", quote);
      return `${p}${h}`;
    }

    // Default: [(model)]
    if (tagName === "select") {
      const p = addProp("value", expr, ws, quote);
      const h = addOn("change", `${expr} = (($event.target as any)?.value)`, " ", quote);
      return `${p}${h}`;
    }
    if (tagName === "textarea") {
      const p = addProp("value", expr, ws, quote);
      const h = addOn("input", `${expr} = (($event.target as any)?.value)`, " ", quote);
      return `${p}${h}`;
    }
    if (tagName === "input" && inputType === "checkbox") {
      const p = addProp("checked", expr, ws, quote);
      const h = addOn("change", `${expr} = (($event.target as any)?.checked)`, " ", quote);
      return `${p}${h}`;
    }
    if (tagName === "input" && inputType === "radio") {
      // checked = (model === el.value)  (computed during render; see checked:radio special-case)
      const p = addProp("checked:radio", expr, ws, quote);
      // Some browsers/contexts are inconsistent between `change` and `input` for radios.
      // Bind both to guarantee model update + re-render.
      const h1 = addOn("change", `${expr} = (($event.target as any)?.value)`, " ", quote);
      const h2 = addOn("input", `${expr} = (($event.target as any)?.value)`, " ", quote);
      return `${p}${h1}${h2}`;
    }

    // Fallback: value + input
    const p = addProp("value", expr, ws, quote);
    const h = addOn("input", `${expr} = (($event.target as any)?.value)`, " ", quote);
    return `${p}${h}`;
  });

  // [attr.*]
  html = html.replace(reAttr, (_m, ws: string, name: string, quote: string, rawExpr: string) => {
    const expr = String(rawExpr ?? "").trim();
    const attrName = String(name ?? "").trim();
    if (!expr || !attrName) return _m;
    return addAttr(attrName, expr, ws, quote);
  });
  // [class.*]
  html = html.replace(reClass, (_m, ws: string, name: string, quote: string, rawExpr: string) => {
    const expr = String(rawExpr ?? "").trim();
    const className = String(name ?? "").trim();
    if (!expr || !className) return _m;
    return addClass(className, expr, ws, quote);
  });
  // [style] map
  html = html.replace(reStyleMap, (_m, ws: string, quote: string, rawExpr: string) => {
    const expr = String(rawExpr ?? "").trim();
    if (!expr) return _m;
    return addStyleMap(expr, ws, quote);
  });
  // [class] map
  html = html.replace(reClassMap, (_m, ws: string, quote: string, rawExpr: string) => {
    const expr = String(rawExpr ?? "").trim();
    if (!expr) return _m;
    return addClassMap(expr, ws, quote);
  });
  // [style.prop(.unit)]
  html = html.replace(reStyle, (_m, ws: string, prop: string, unit: string | undefined, quote: string, rawExpr: string) => {
    const expr = String(rawExpr ?? "").trim();
    const styleProp = String(prop ?? "").trim();
    if (!expr || !styleProp) return _m;
    const u = unit ? String(unit).trim() : null;
    return addStyle(styleProp, u || null, expr, ws, quote);
  });
  // [prop]
  html = html.replace(reProp, (_m, ws: string, name: string, quote: string, rawExpr: string) => {
    const expr = String(rawExpr ?? "").trim();
    const propName = String(name ?? "").trim();
    if (!expr || !propName) return _m;
    // skip ones already handled via [attr.*]/[class.*]
    if (propName.startsWith("attr.") || propName.startsWith("class.")) return _m;
    return addProp(propName, expr, ws, quote);
  });
  // (event)
  html = html.replace(reOn, (_m, ws: string, name: string, quote: string, rawExpr: string) => {
    const handlerExpr = String(rawExpr ?? "").trim();
    const evName = String(name ?? "").trim();
    if (!handlerExpr || !evName) return _m;
    return addOn(evName, handlerExpr, ws, quote);
  });

  return { html, propHoles, classHoles, attrHoles, eventHoles, styleHoles, styleMapHoles, classMapHoles };
}

/**
 * Mixed interpolation inside attribute values:
 * - href="/u/{{ id }}" or title="Hello {{ name }}"
 *
 * Rewrites to:
 * - href="" data-abey-attrmix-<idx>="href"
 * and stores parts for render-time concatenation.
 *
 * MVP: supports simple `{{ expr }}` placeholders (no nesting).
 */
function extractAttrMixedInterpolation(template: string, counters: Counters): { html: string; holes: AttrMixHole[] } {
  const holes: AttrMixHole[] = [];
  const re = /(\s)([a-zA-Z_:][\w:.-]*)\s*=\s*(["'])([^"']*?\{\{[\s\S]*?\}\}[^"']*?)\3/g;
  const html = template.replace(re, (_m, ws: string, attrName: string, quote: string, rawVal: string) => {
    const v = String(rawVal ?? "");
    const parts: AttrMixPart[] = [];
    let i = 0;
    while (i < v.length) {
      const s = v.indexOf("{{", i);
      if (s === -1) {
        const tail = v.slice(i);
        if (tail) parts.push({ t: "text", v: tail });
        break;
      }
      const before = v.slice(i, s);
      if (before) parts.push({ t: "text", v: before });
      const e = v.indexOf("}}", s + 2);
      if (e === -1) {
        // treat rest as text if broken
        const tail = v.slice(s);
        if (tail) parts.push({ t: "text", v: tail });
        break;
      }
      const expr = v.slice(s + 2, e).trim();
      if (expr) parts.push({ t: "expr", v: expr });
      else parts.push({ t: "text", v: v.slice(s, e + 2) });
      i = e + 2;
    }
    const idx = counters.holeIndex++;
    holes.push({ index: idx, attrName, parts });
    return `${ws}${attrName}=${quote}${quote} data-abey-attrmix-${idx}=${quote}${attrName}${quote}`;
  });
  return { html, holes };
}

/**
 * `<select [items]="expr" [value]="id" [name]="label">` sugar.
 *
 * It rewrites the `<select ...>` opening tag to include `data-abey-select-items="<idx>"`
 * and removes those 3 bracket bindings from the tag. The renderer then fills options
 * from the array expression.
 *
 * MVP:
 * - Only supports bracket bindings inside the `<select ...>` opening tag.
 * - `[value]`/`[name]` are treated as **property keys** (identifier or quoted string).
 *   Examples: `[value]="id"` or `[value]="'id'"`.
 */
function extractSelectItemsDirectives(
  input: string,
  counters: Counters,
): { html: string; directives: SelectItemsDirective[] } {
  const directives: SelectItemsDirective[] = [];
  let out = "";
  let i = 0;
  while (i < input.length) {
    const lt = input.indexOf("<select", i);
    if (lt === -1) {
      out += input.slice(i);
      break;
    }
    // copy before <select
    out += input.slice(i, lt);
    const gt = input.indexOf(">", lt);
    if (gt === -1) {
      out += input.slice(lt);
      break;
    }
    const openTag = input.slice(lt, gt + 1);
    // Must be an opening tag, not </select>
    if (openTag.startsWith("</")) {
      out += openTag;
      i = gt + 1;
      continue;
    }

    const itemsM = openTag.match(/\[\s*items\s*\]\s*=\s*(["'])([\s\S]*?)\1/);
    if (!itemsM) {
      out += openTag;
      i = gt + 1;
      continue;
    }
    const itemsExpr = String(itemsM[2] ?? "").trim();
    if (!itemsExpr) {
      out += openTag;
      i = gt + 1;
      continue;
    }

    const parseKey = (raw: string | undefined, fallback: string): string => {
      const t = String(raw ?? "").trim();
      if (!t) return fallback;
      // quoted string
      const qm = t.match(/^["']([\s\S]*)["']$/);
      if (qm) return qm[1] ?? fallback;
      // identifier
      if (/^[a-zA-Z_$][\w$]*$/.test(t)) return t;
      return fallback;
    };

    const valueM = openTag.match(/\[\s*value\s*\]\s*=\s*(["'])([\s\S]*?)\1/);
    const nameM = openTag.match(/\[\s*name\s*\]\s*=\s*(["'])([\s\S]*?)\1/);
    const valueKey = parseKey(valueM?.[2], "id");
    const labelKey = parseKey(nameM?.[2], "label");

    const idx = counters.holeIndex++;
    directives.push({ index: idx, itemsExpr, valueKey, labelKey });

    // Remove the directive bindings from the tag.
    let cleaned = openTag
      .replace(/\s*\[\s*items\s*\]\s*=\s*(["'])([\s\S]*?)\1/g, "")
      .replace(/\s*\[\s*value\s*\]\s*=\s*(["'])([\s\S]*?)\1/g, "")
      .replace(/\s*\[\s*name\s*\]\s*=\s*(["'])([\s\S]*?)\1/g, "");
    // Inject marker before '>'
    cleaned = cleaned.replace(/>$/, ` data-abey-select-items="${idx}">`);
    out += cleaned;
    i = gt + 1;
  }
  return { html: out, directives };
}

/** Span (half-open **[start,end)**) dentro del template fuente. */
type TemplateSpan = { start: number; end: number };

/** Primer `<pre` desde `from` (-1 si no hay). */
function findNextPreOpen(html: string, from: number): number {
  const re = /<pre\b/gi;
  re.lastIndex = Math.max(0, from);
  const m = re.exec(html);
  return m?.index ?? -1;
}

/** Primer `</pre>` desde `from` (-1 si no hay). Índice al `<`. */
function findNextPreClose(html: string, from: number): number {
  const re = /<\/pre\s*>/gi;
  re.lastIndex = Math.max(0, from);
  const m = re.exec(html);
  return m?.index ?? -1;
}

/**
 * Todo `<pre>...</pre>` con **anidamiento** (`<pre` dentro del bloque aumenta depth).
 * Evita cerrar antes de tiempo cuando el ejemplo contiene el texto `</pre>`.
 */
function spansPreSections(html: string): TemplateSpan[] {
  const spans: TemplateSpan[] = [];
  let outer = 0;
  while (outer < html.length) {
    const openIdx = findNextPreOpen(html, outer);
    if (openIdx < 0) break;
    const gt = html.indexOf(">", openIdx);
    if (gt < 0) break;
    let cursor = gt + 1;
    let depth = 1;
    while (cursor < html.length && depth > 0) {
      const nextOpen = findNextPreOpen(html, cursor);
      const nextClose = findNextPreClose(html, cursor);
      if (nextClose < 0) {
        depth = -1;
        break;
      }
      if (nextOpen >= 0 && nextOpen < nextClose) {
        const innerGt = html.indexOf(">", nextOpen);
        if (innerGt < 0) {
          depth = -1;
          break;
        }
        depth++;
        cursor = innerGt + 1;
      } else {
        const slice = html.slice(nextClose);
        const closeTag = /<\/pre\s*>/i.exec(slice);
        const len = closeTag?.[0].length ?? 0;
        cursor = nextClose + len;
        depth--;
        if (depth === 0) {
          spans.push({ start: openIdx, end: cursor });
          outer = cursor;
          break;
        }
      }
    }
    if (depth !== 0) {
      outer = openIdx + 1;
    }
  }
  return spans;
}

function spanContained(span: TemplateSpan, by: TemplateSpan[]): boolean {
  for (const s of by) {
    if (span.start >= s.start && span.end <= s.end) {
      return true;
    }
  }
  return false;
}

/** `<code>...</code>` que no está contenido dentro de ningún `<pre>...</pre>` (Markdown inline). */
function spansCodeOutsidePre(html: string, pres: TemplateSpan[]): TemplateSpan[] {
  const spans: TemplateSpan[] = [];
  const re = /<code\b[^>]*>[\s\S]*?<\/code>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (!spanContained(span, pres)) {
      spans.push(span);
    }
  }
  return spans;
}

/**
 * TEXTO dentro de estos spans se copia tal cual para **extractHoles** (no `{}`/`{{ }}` sintácticos).
 * Ej.: bloques de código en documentación donde hay `{ ... }`, `{{ estado }}`, etc.
 */
function literalHoleSkipSpans(html: string): TemplateSpan[] {
  const pres = spansPreSections(html);
  return pres.concat(spansCodeOutsidePre(html, pres));
}

function cursorInSpans(i: number, spans: TemplateSpan[]): boolean {
  for (const s of spans) {
    if (i >= s.start && i < s.end) {
      return true;
    }
  }
  return false;
}

function markerShield(idx: number): string {
  return `\uE000ABEYSHLD${idx}\uE001`;
}

/**
 * Sustituye regiones literales (`<pre>`/`<code>`) por marcadores para que **todas** las pasadas OM
 * (`[prop]`, `(click)`, `{}`, `{{}}`, etc.) no vean el fragmento real.
 */
function shieldLiteralRegions(html: string): { masked: string; parts: string[] } {
  const spans = literalHoleSkipSpans(html);
  if (spans.length === 0) {
    return { masked: html, parts: [] };
  }
  spans.sort((a, b) => a.start - b.start);
  const parts: string[] = [];
  let masked = "";
  let last = 0;
  for (let i = 0; i < spans.length; i++) {
    const s = spans[i]!;
    masked += html.slice(last, s.start) + markerShield(i);
    parts.push(html.slice(s.start, s.end));
    last = s.end;
  }
  masked += html.slice(last);
  return { masked, parts };
}

function unshieldMasked(html: string, parts: string[]): string {
  let out = html;
  for (let i = 0; i < parts.length; i++) {
    const ph = markerShield(i);
    while (out.includes(ph)) {
      out = out.replace(ph, parts[i] ?? "");
    }
  }
  return out;
}

/**
 * Replace `{...}` in template text with placeholder elements `<span data-abey-hole="IDX"></span>`.
 *
 * MVP limitations:
 * - Expressions are supported only in text/child positions (not inside tags/attributes).
 * - Braces inside strings are not supported (simple scanner).
 * - TEXTO dentro de `<pre>...</pre>` o `<code>...</code>` fuera de `<pre>` no se procesa aquí (`{}`, `{{ }}` literales; útil en docs/ejemplos).
 */
function extractHoles(template: string, counters: Counters): { html: string; holes: ExprHole[] } {
  const holes: ExprHole[] = [];
  let out = "";
  let i = 0;
  const litSpans = literalHoleSkipSpans(template);
  // Only support holes in text/child positions (outside tags).
  // So we skip scanning when we're inside `<...>` or inside quoted attribute values.
  let inTag = false;
  let quote: "'" | '"' | null = null;
  while (i < template.length) {
    const ch = template[i]!;
    if (cursorInSpans(i, litSpans)) {
      out += ch;
      i++;
      continue;
    }
    if (inTag) {
      out += ch;
      if (quote) {
        if (ch === quote) quote = null;
      } else {
        if (ch === '"' || ch === "'") quote = ch as any;
        else if (ch === ">") inTag = false;
      }
      i++;
      continue;
    }
    if (ch === "<") {
      inTag = true;
      out += ch;
      i++;
      continue;
    }
    // Mustache-style text interpolation: {{ expr }}
    if (ch === "{" && template[i + 1] === "{") {
      const start = i;
      const end = template.indexOf("}}", start + 2);
      if (end === -1) {
        out += ch;
        i++;
        continue;
      }
      const rawExpr = template.slice(start + 2, end).trim();
      if (!rawExpr) {
        out += template.slice(start, end + 2);
        i = end + 2;
        continue;
      }
      const idx = counters.holeIndex++;
      holes.push({ index: idx, expr: rawExpr });
      out += `<span data-abey-hole="${idx}"></span>`;
      i = end + 2;
      continue;
    }

    if (ch !== "{") {
      out += ch;
      i++;
      continue;
    }

    // scan to matching `}` (no nesting for MVP)
    const start = i;
    const end = template.indexOf("}", start + 1);
    if (end === -1) {
      out += ch;
      i++;
      continue;
    }
    const rawExpr = template.slice(start + 1, end).trim();
    // ignore empty
    if (!rawExpr) {
      out += template.slice(start, end + 1);
      i = end + 1;
      continue;
    }
    const idx = counters.holeIndex++;
    holes.push({ index: idx, expr: rawExpr });
    out += `<span data-abey-hole="${idx}"></span>`;
    i = end + 1;
  }
  return { html: out, holes };
}

function scanBalanced(input: string, openPos: number, openChar: string, closeChar: string): number | null {
  if (input[openPos] !== openChar) return null;
  let depth = 1;
  let p = openPos + 1;
  while (p < input.length && depth > 0) {
    const c = input[p]!;
    if (c === openChar) depth++;
    else if (c === closeChar) depth--;
    p++;
  }
  return depth === 0 ? p - 1 : null;
}

/**
 * Extract `@for (...) { ... }` blocks and replace them with `<template data-abey-for="IDX"></template>`.
 *
 * Supported syntax (MVP):
 * - `@for (item of <expr>) { <html-with-{expr}-holes> }`
 * - `@for (item of <expr>; track <ignored>) { ... }`
 *
 * Notes:
 * - No nested `@for` blocks in this MVP parser.
 */
function extractForBlocks(
  input: string,
  counters: Counters,
): { html: string; forBlocks: ForBlock[]; ifBlocks: IfBlock[] } {
  const forBlocks: ForBlock[] = [];
  const ifBlocks: IfBlock[] = [];
  let out = "";
  let i = 0;

  const startsWithAtFor = (pos: number): boolean => input.slice(pos, pos + 4) === "@for";

  while (i < input.length) {
    if (!startsWithAtFor(i)) {
      out += input[i]!;
      i++;
      continue;
    }

    // parse `@for`
    let p = i + 4;
    while (p < input.length && /\s/.test(input[p]!)) p++;
    if (input[p] !== "(") {
      out += input[i]!;
      i++;
      continue;
    }
    const parenStart = p;
    const parenEnd = scanBalanced(input, parenStart, "(", ")");
    if (parenEnd === null) {
      out += input[i]!;
      i++;
      continue;
    }
    const header = input.slice(parenStart + 1, parenEnd).trim();
    // header: `<var> of <expr>` or `<var> of <expr>; track ...`
    const [left] = header.split(";").map((s) => s.trim());
    const m = left.match(/^([a-zA-Z_$][\w$]*)\s+of\s+([\s\S]+)$/);
    if (!m) {
      out += input[i]!;
      i++;
      continue;
    }
    const itemVar = m[1]!;
    const listExpr = m[2]!.trim();

    // parse block body: find `{ ... }` after `)`
    p = parenEnd + 1;
    while (p < input.length && /\s/.test(input[p]!)) p++;
    if (input[p] !== "{") {
      out += input[i]!;
      i++;
      continue;
    }

    const bodyOpen = p;
    const bodyClose = scanBalanced(input, bodyOpen, "{", "}");
    if (bodyClose === null) {
      out += input[i]!;
      i++;
      continue;
    }
    const rawBody = input.slice(bodyOpen + 1, bodyClose);
    // Allow nested blocks in the body.
    const nestedIf = extractIfBlocks(rawBody, counters);
    const nestedFor = extractForBlocks(nestedIf.html, counters);
    const nestedHoles = extractHoles(nestedFor.html, counters);

    const bIndex = counters.forIndex++;
    forBlocks.push({ index: bIndex, itemVar, listExpr, bodyHtml: nestedHoles.html, bodyHoles: nestedHoles.holes });
    ifBlocks.push(...nestedIf.ifBlocks);
    ifBlocks.push(...nestedFor.ifBlocks);
    forBlocks.push(...nestedFor.forBlocks);
    out += `<template data-abey-for="${bIndex}"></template>`;
    i = bodyClose + 1;
  }

  return { html: out, forBlocks, ifBlocks };
}

/**
 * Extract `@if (expr) { ... } [@else if (...) { ... }]* [@else { ... }]` blocks and replace with
 * `<template data-abey-if="IDX"></template>` anchors.
 *
 * Nested `@if` / `@for` inside branches is supported (recursive extract + ordered mount).
 */
function extractIfBlocks(
  input: string,
  counters: Counters,
): { html: string; ifBlocks: IfBlock[]; forBlocks: ForBlock[] } {
  const ifBlocks: IfBlock[] = [];
  const forBlocks: ForBlock[] = [];
  let out = "";
  let i = 0;

  const startsWithAtIf = (pos: number): boolean => input.slice(pos, pos + 3) === "@if";

  while (i < input.length) {
    if (!startsWithAtIf(i)) {
      out += input[i]!;
      i++;
      continue;
    }

    let p = i + 3;
    while (p < input.length && /\s/.test(input[p]!)) p++;
    if (input[p] !== "(") {
      out += input[i]!;
      i++;
      continue;
    }
    const parenStart = p;
    const parenEnd = scanBalanced(input, parenStart, "(", ")");
    if (parenEnd === null) {
      out += input[i]!;
      i++;
      continue;
    }
    const testExpr = input.slice(parenStart + 1, parenEnd).trim();
    p = parenEnd + 1;
    while (p < input.length && /\s/.test(input[p]!)) p++;
    if (input[p] !== "{") {
      out += input[i]!;
      i++;
      continue;
    }
    const thenOpen = p;
    const thenClose = scanBalanced(input, thenOpen, "{", "}");
    if (thenClose === null) {
      out += input[i]!;
      i++;
      continue;
    }
    const thenRaw = input.slice(thenOpen + 1, thenClose);
    const thenNestedIf = extractIfBlocks(thenRaw, counters);
    const thenNestedFor = extractForBlocks(thenNestedIf.html, counters);
    const thenExtracted = extractHoles(thenNestedFor.html, counters);

    p = thenClose + 1;
    while (p < input.length && /\s/.test(input[p]!)) p++;

    // Parse @else-if chain
    type ElseIfBranch = { testExpr: string; thenHtml: string; thenHoles: ExprHole[]; nestedIf: IfBlock[]; nestedFor: ForBlock[] };
    const elseIfs: ElseIfBranch[] = [];
    let elseHtmlFinal: string | null = null;
    let elseHolesFinal: ExprHole[] = [];

    const parseBranchBody = (raw: string): { html: string; holes: ExprHole[]; nestedIf: IfBlock[]; nestedFor: ForBlock[] } => {
      const nIf = extractIfBlocks(raw, counters);
      const nFor = extractForBlocks(nIf.html, counters);
      const nH = extractHoles(nFor.html, counters);
      return { html: nH.html, holes: nH.holes, nestedIf: [...nIf.ifBlocks, ...nFor.ifBlocks], nestedFor: [...nIf.forBlocks, ...nFor.forBlocks] };
    };

    let p2 = p;
    while (input.slice(p2, p2 + 5) === "@else") {
      p2 += 5;
      while (p2 < input.length && /\s/.test(input[p2]!)) p2++;

      // @else if (...) { ... }
      if (input.slice(p2, p2 + 2) === "if") {
        p2 += 2;
        while (p2 < input.length && /\s/.test(input[p2]!)) p2++;
        if (input[p2] !== "(") break;
        const pe2 = scanBalanced(input, p2, "(", ")");
        if (pe2 === null) break;
        const t2 = input.slice(p2 + 1, pe2).trim();
        p2 = pe2 + 1;
        while (p2 < input.length && /\s/.test(input[p2]!)) p2++;
        if (input[p2] !== "{") break;
        const bo2 = p2;
        const bc2 = scanBalanced(input, bo2, "{", "}");
        if (bc2 === null) break;
        const raw2 = input.slice(bo2 + 1, bc2);
        const parsed = parseBranchBody(raw2);
        elseIfs.push({ testExpr: t2, thenHtml: parsed.html, thenHoles: parsed.holes, nestedIf: parsed.nestedIf, nestedFor: parsed.nestedFor });
        p2 = bc2 + 1;
        while (p2 < input.length && /\s/.test(input[p2]!)) p2++;
        continue;
      }

      // @else { ... }
      if (input[p2] === "{") {
        const eo = p2;
        const ec = scanBalanced(input, eo, "{", "}");
        if (ec === null) break;
        const raw = input.slice(eo + 1, ec);
        const parsed = parseBranchBody(raw);
        elseHtmlFinal = parsed.html;
        elseHolesFinal = parsed.holes;
        ifBlocks.push(...parsed.nestedIf);
        forBlocks.push(...parsed.nestedFor);
        p2 = ec + 1;
        while (p2 < input.length && /\s/.test(input[p2]!)) p2++;
        break;
      }

      break;
    }

    // Collect nested blocks from then branch
    ifBlocks.push(...thenNestedIf.ifBlocks);
    forBlocks.push(...thenNestedIf.forBlocks);
    ifBlocks.push(...thenNestedFor.ifBlocks);
    forBlocks.push(...thenNestedFor.forBlocks);

    // Build nested else-if blocks (as templates) from right to left.
    let elseHtml: string | null = elseHtmlFinal;
    let elseHoles: ExprHole[] = elseHolesFinal;
    for (let ei = elseIfs.length - 1; ei >= 0; ei--) {
      const br = elseIfs[ei]!;
      const idx2 = counters.ifIndex++;
      ifBlocks.push({
        index: idx2,
        testExpr: br.testExpr,
        thenHtml: br.thenHtml,
        thenHoles: br.thenHoles,
        elseHtml,
        elseHoles,
      });
      ifBlocks.push(...br.nestedIf);
      forBlocks.push(...br.nestedFor);
      elseHtml = `<template data-abey-if="${idx2}"></template>`;
      elseHoles = [];
    }

    const bIndex = counters.ifIndex++;
    ifBlocks.push({
      index: bIndex,
      testExpr,
      thenHtml: thenExtracted.html,
      thenHoles: thenExtracted.holes,
      elseHtml,
      elseHoles,
    });

    out += `<template data-abey-if="${bIndex}"></template>`;
    i = p2;
  }

  return { html: out, ifBlocks, forBlocks };
}

function buildRuntimeHelpers(): string {
  return `
type AbeyRenderValue = Node | string | number | boolean | null | undefined | Array<AbeyRenderValue>;

function abeyAppend(parent: Node, v: AbeyRenderValue): void {
  if (v === null || v === undefined || v === false) return;
  if (Array.isArray(v)) {
    for (const it of v) abeyAppend(parent, it);
    return;
  }
  if (v instanceof Node) {
    parent.appendChild(v);
    return;
  }
  parent.appendChild(document.createTextNode(String(v)));
}

function abeySetHole(host: HTMLElement, v: AbeyRenderValue): void {
  host.textContent = "";
  const frag = document.createDocumentFragment();
  abeyAppend(frag, v);
  host.appendChild(frag);
}

function abeyClearBetween(start: Comment, end: Comment): void {
  let n: ChildNode | null = start.nextSibling;
  while (n && n !== end) {
    const next = n.nextSibling;
    n.remove();
    n = next;
  }
}

function abeyInsertTemplateBefore(anchorEnd: Comment, html: string, bindings: Array<{ idx: number; expr: () => AbeyRenderValue }>): void {
  const t = document.createElement("template");
  t.innerHTML = html;
  const frag = t.content.cloneNode(true) as DocumentFragment;
  const holeMap = new Map<number, HTMLElement>();
  const tw = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode() as HTMLElement | null; n; n = tw.nextNode() as HTMLElement | null) {
    const raw = n.getAttribute("data-abey-hole");
    if (raw === null) continue;
    const idx = raw ? Number(raw) : NaN;
    if (!Number.isFinite(idx)) continue;
    holeMap.set(idx, n);
  }
  for (const b of bindings) {
    const host = holeMap.get(b.idx);
    if (host) abeySetHole(host, b.expr());
  }
  anchorEnd.before(frag);
}
`.trim();
}

/**
 * Turn a `.view.html` / `.abey` source string into executable TypeScript.
 *
 * Pipeline highlights:
 * - Optional YAML frontmatter split (`---` … `---`).
 * - Sugar preprocess (`*if`, `*for`, `@switch`) before structural passes.
 * - Mixed attribute interpolation, exact `{{ expr }}` attributes, `<select [items]>` helpers, bracket bindings,
 *   `@if` / `@for`, then text holes (`{{ }}` / `{expr}`) with deterministic marker ids.
 * - Emits `template`, `compiledTemplate`, `mount`, optional `AbeyComponent` custom element when frontmatter declares it.
 *
 * @param source Raw file contents (including optional frontmatter).
 * @param id Absolute or project-relative path; echoed in `// Generated from …` and passed to downstream transforms as `sourcefile`.
 * @returns `{ code }` — runnable TS module text (source map slot reserved on `CompileAbeyResult` for future use).
 */
export function compileAbeyToTs(source: string, id: string): CompileAbeyResult {
  const { frontmatter, template: rawTemplate } = splitFrontmatter(source);
  const componentMeta = parseComponentMeta(frontmatter);
  const frontmatterOut = componentMeta ? componentMeta.frontmatterRest : frontmatter;
  const counters: Counters = { forIndex: 0, ifIndex: 0, holeIndex: 0 };
  const shields = shieldLiteralRegions(rawTemplate);
  const maskedTemplate = shields.masked;
  const sugar = preprocessSugar(maskedTemplate);
  const attrMixExtracted = extractAttrMixedInterpolation(sugar, counters);
  const attrExtracted = extractAttrHoles(attrMixExtracted.html, counters);
  // IMPORTANT: extract `<select [items] [value] [name]>` before generic `[prop]` extraction,
  // otherwise `[value]="id"` would be treated as a JS expression and crash at runtime.
  const selectExtracted = extractSelectItemsDirectives(attrExtracted.html, counters);
  const bracketExtracted = extractBracketBindings(selectExtracted.html, counters);
  const ifExtracted = extractIfBlocks(bracketExtracted.html, counters);
  const forExtracted = extractForBlocks(ifExtracted.html, counters);
  const { html, holes } = extractHoles(forExtracted.html, counters);
  const htmlRestored = unshieldMasked(html, shields.parts);
  const safeHtml = escapeForTemplateLiteral(htmlRestored);
  const safeRawTemplate = escapeForTemplateLiteral(rawTemplate);
  const allIfBlocks = [...ifExtracted.ifBlocks, ...forExtracted.ifBlocks];
  /** `@for` loops nested under `@if/@else` land in `ifExtracted.forBlocks`, not the flat post-`@if` HTML. */
  const allForBlocks = [...ifExtracted.forBlocks, ...forExtracted.forBlocks];
  // IMPORTANT: Render control-flow blocks from outer → inner.
  // Indices are allocated monotonically; outer blocks are created later, so they have higher indices.
  // If we render inner blocks first, the parent `@if` may clear its region and wipe the nested output.
  const ifBlocksSorted = [...allIfBlocks].sort((a, b) => b.index - a.index);
  const forBlocksSorted = [...allForBlocks].sort((a, b) => b.index - a.index);
  const compiledAttrHoles = [...bracketExtracted.attrHoles];
  const aotBuild = componentMeta?.aot ? buildAotFactory(htmlRestored) : null;

  const componentBlock = (() => {
    if (!componentMeta) return "";
    const classBase = pascalFromKebab(componentMeta.selector);
    const className = `${classBase}Element`;
    const styleImports = componentMeta.styles
      .map((p, idx) => `import __abeyStyle${idx} from ${JSON.stringify(p + "?url")};`)
      .join("\n");
    const styleList = componentMeta.styles.map((_p, idx) => `__abeyStyle${idx}`).join(", ");
    const stateLine = componentMeta.stateExpr
      ? `  constructor() {\n    super();\n    this.state = (${componentMeta.stateExpr}) as any;\n  }\n`
      : ``;
    return `
import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
${styleImports}

@AbeyComponent({
  selector: ${JSON.stringify(componentMeta.selector)},
  // The component mounts the compiled template into this outlet.
  template: '<div data-abey-outlet></div>',
  stylesHrefs: [${styleList}],
} as any)
export class ${className} extends AbeyComponentElement {
${stateLine}
  #handle: { dispose?: () => void } | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      const host = this.querySelector("[data-abey-outlet]") as HTMLElement | null;
      if (!host) return;
      try {
        this.#handle?.dispose?.();
      } catch {
        /* */
      }
      // Use the component reactive state as ctx for the compiled template.
      this.#handle = mount(host, (this.state as any) ?? ({} as any));
    });
  }

  disconnectedCallback(): void {
    try {
      this.#handle?.dispose?.();
    } catch {
      /* */
    }
    this.#handle = null;
    super.disconnectedCallback();
  }
}
`.trim();
  })();

  const code = `
// Generated from ${id}
${frontmatterOut}

${buildRuntimeHelpers()}

/** Raw template for @AbeyComponent (keeps {{ ... }} attribute bindings). */
export const template = \`${safeRawTemplate}\`;
/** Compiled template for mount() (holes/@if/@for expanded). */
export const compiledTemplate = \`${safeHtml}\`;

${componentBlock}

export function mount(outlet: HTMLElement, ctx: Ctx): { render: () => void; dispose: () => void } {
  const holeEls = new Map<number, HTMLElement>();
  const attrEls = new Map<number, { el: HTMLElement; attr: string }>();
  const attrMixEls = new Map<number, { el: HTMLElement; attr: string }>();
  const propEls = new Map<number, { el: any; prop: string }>();
  const classEls = new Map<number, { el: HTMLElement; cls: string }>();
  const onEls = new Map<number, { el: HTMLElement; ev: string }>();
  const onDisposers = new Map<number, () => void>();
  const styleEls = new Map<number, { el: HTMLElement; prop: string }>();
  const styleMapEls = new Map<number, HTMLElement>();
  const styleMapPrev = new Map<number, string[]>();
  const classMapEls = new Map<number, HTMLElement>();
  const classMapBase = new Map<number, string>();
  const selectEls = new Map<number, HTMLSelectElement>();
  const selectPlaceholders = new Map<number, HTMLOptionElement | null>();
  const forAnchors = new Map<number, { start: Comment; end: Comment; tpl: HTMLTemplateElement }>();
  const ifAnchors = new Map<number, { start: Comment; end: Comment; tpl: HTMLTemplateElement }>();
  const ifPrev = new Map<number, boolean>();

  const __abeyUseAot = ${aotBuild ? "true" : "false"};
  if (__abeyUseAot) {
${aotBuild ? indentLines(aotBuild.createCode, 4) : ""}
${aotBuild ? indentLines(aotBuild.rootAppendCode, 4) : ""}
${aotBuild ? indentLines(aotBuild.bindCode, 4) : ""}
  } else {
    const tpl = document.createElement("template");
    tpl.innerHTML = compiledTemplate;
    outlet.textContent = "";
    outlet.appendChild(tpl.content.cloneNode(true));
  }

  const scanNewBindings = (): boolean => {
    if (__abeyUseAot) return false;
    let changed = false;
    const templatesFor: Array<{ idx: number; t: HTMLTemplateElement }> = [];
    const templatesIf: Array<{ idx: number; t: HTMLTemplateElement }> = [];

    // NOTE: Do not mutate the DOM (replaceWith) while TreeWalker is iterating,
    // it can skip nodes and cause @else-if chains to never activate.
    const tw = document.createTreeWalker(outlet, NodeFilter.SHOW_ELEMENT);
    for (let el = tw.nextNode() as HTMLElement | null; el; el = tw.nextNode() as HTMLElement | null) {
      const rawHole = el.getAttribute("data-abey-hole");
      if (rawHole !== null) {
        const idx = rawHole ? Number(rawHole) : NaN;
        if (Number.isFinite(idx) && !holeEls.has(idx)) {
          holeEls.set(idx, el);
          changed = true;
        }
      }

      if (el.tagName.toLowerCase() === "template") {
        const rawFor = el.getAttribute("data-abey-for");
        if (rawFor !== null) {
          const idx = rawFor ? Number(rawFor) : NaN;
          if (Number.isFinite(idx) && !forAnchors.has(idx)) {
            templatesFor.push({ idx, t: el as unknown as HTMLTemplateElement });
          }
        }
        const rawIf = el.getAttribute("data-abey-if");
        if (rawIf !== null) {
          const idx = rawIf ? Number(rawIf) : NaN;
          if (Number.isFinite(idx) && !ifAnchors.has(idx)) {
            templatesIf.push({ idx, t: el as unknown as HTMLTemplateElement });
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attrs: NamedNodeMap | undefined = (el as any)?.attributes;
      if (!attrs) continue;
      for (let ai = 0; ai < attrs.length; ai++) {
        const a = attrs.item(ai);
        if (!a) continue;
        const n = a.name ?? "";
        const v = String(a.value ?? "").trim();

        if (n.startsWith("data-abey-attr-")) {
          const idx = Number(n.slice("data-abey-attr-".length));
          if (Number.isFinite(idx) && !attrEls.has(idx) && v) {
            attrEls.set(idx, { el, attr: v });
            changed = true;
          }
          continue;
        }
        if (n.startsWith("data-abey-attrmix-")) {
          const idx = Number(n.slice("data-abey-attrmix-".length));
          if (Number.isFinite(idx) && !attrMixEls.has(idx) && v) {
            attrMixEls.set(idx, { el, attr: v });
            changed = true;
          }
          continue;
        }
        if (n === "data-abey-select-items") {
          const idx = a.value ? Number(a.value) : NaN;
          if (Number.isFinite(idx) && !selectEls.has(idx) && el.tagName.toLowerCase() === "select") {
            const sel = el as unknown as HTMLSelectElement;
            selectEls.set(idx, sel);
            const ph = sel.querySelector('option[value=""]');
            selectPlaceholders.set(idx, (ph ? (ph.cloneNode(true) as HTMLOptionElement) : null) ?? null);
            changed = true;
          }
          continue;
        }
        if (n.startsWith("data-abey-style-")) {
          const idx = Number(n.slice("data-abey-style-".length));
          if (Number.isFinite(idx) && !styleEls.has(idx) && v) {
            styleEls.set(idx, { el, prop: v });
            changed = true;
          }
          continue;
        }
        if (n.startsWith("data-abey-stylemap-")) {
          const idx = Number(n.slice("data-abey-stylemap-".length));
          if (Number.isFinite(idx) && !styleMapEls.has(idx)) {
            styleMapEls.set(idx, el);
            changed = true;
          }
          continue;
        }
        if (n.startsWith("data-abey-classmap-")) {
          const idx = Number(n.slice("data-abey-classmap-".length));
          if (Number.isFinite(idx) && !classMapEls.has(idx)) {
            classMapEls.set(idx, el);
            classMapBase.set(idx, String(el.className ?? ""));
            changed = true;
          }
          continue;
        }
        if (n.startsWith("data-abey-prop-")) {
          const idx = Number(n.slice("data-abey-prop-".length));
          if (Number.isFinite(idx) && !propEls.has(idx) && v) {
            propEls.set(idx, { el: el as any, prop: v });
            changed = true;
          }
          continue;
        }
        if (n.startsWith("data-abey-class-")) {
          const idx = Number(n.slice("data-abey-class-".length));
          if (Number.isFinite(idx) && !classEls.has(idx) && v) {
            classEls.set(idx, { el, cls: v });
            changed = true;
          }
          continue;
        }
        if (n.startsWith("data-abey-on-")) {
          const idx = Number(n.slice("data-abey-on-".length));
          if (Number.isFinite(idx) && !onEls.has(idx) && v) {
            onEls.set(idx, { el, ev: v });
            changed = true;
          }
          continue;
        }
      }
    }

    for (const it of templatesFor) {
      const start = document.createComment("abey-for:start:" + it.idx);
      const end = document.createComment("abey-for:end:" + it.idx);
      it.t.replaceWith(start, end);
      forAnchors.set(it.idx, { start, end, tpl: it.t });
      changed = true;
    }
    for (const it of templatesIf) {
      const start = document.createComment("abey-if:start:" + it.idx);
      const end = document.createComment("abey-if:end:" + it.idx);
      it.t.replaceWith(start, end);
      ifAnchors.set(it.idx, { start, end, tpl: it.t });
      // Anchor got recreated; force the block to re-render.
      ifPrev.delete(it.idx);
      changed = true;
    }

    return changed;
  };

  const render = (): void => {
    // Nested control-flow blocks can be introduced during a render (e.g. @for inside @else).
    // We iteratively scan and activate new templates/holes until the DOM stabilizes.
    for (let __pass = 0; __pass < 6; __pass++) {
      let __changed = scanNewBindings();

${holes.map((h) => `    {\n      const host = holeEls.get(${h.index});\n      if (host) abeySetHole(host, (${h.expr}) as any);\n    }`).join("\n")}

${compiledAttrHoles
  .map((h) => {
    return `    {\n      const a = attrEls.get(${h.index});\n      if (a) {\n        const v = (${h.expr}) as any;\n        a.el.setAttribute(a.attr, v == null ? \"\" : String(v));\n      }\n    }`;
  })
  .join("\n")}

${attrMixExtracted.holes
  .map((h) => {
    const exprs = h.parts
      .map((p) => (p.t === "text" ? JSON.stringify(p.v) : `(${p.v})`))
      .join(" + ");
    return `    {\n      const a = attrMixEls.get(${h.index});\n      if (a) {\n        const v = (${exprs}) as any;\n        a.el.setAttribute(a.attr, v == null ? \"\" : String(v));\n      }\n    }`;
  })
  .join("\n")}

${bracketExtracted.propHoles
  .map((h) => {
    // Special-case radio checked: compare model to element.value.
    if (h.propName === "checked:radio") {
      return `    {\n      const a = propEls.get(${h.index});\n      if (a) {\n        const v = (a.el as any)?.value;\n        (a.el as any).checked = ((${h.expr}) as any) === v;\n      }\n    }`;
    }
    return `    {\n      const a = propEls.get(${h.index});\n      if (a) {\n        (a.el as any)[a.prop] = (${h.expr}) as any;\n      }\n    }`;
  })
  .join("\n")}

${bracketExtracted.classHoles
  .map((h) => {
    return `    {\n      const a = classEls.get(${h.index});\n      if (a) {\n        const ok = !!((${h.expr}) as any);\n        a.el.classList.toggle(a.cls, ok);\n      }\n    }`;
  })
  .join("\n")}

${bracketExtracted.styleHoles
  .map((h) => {
    const unitLit = h.unit ? JSON.stringify(h.unit) : "null";
    return `    {\n      const a = styleEls.get(${h.index});\n      if (a) {\n        const v = (${h.expr}) as any;\n        const u = ${unitLit} as any;\n        const vv = v == null ? \"\" : (u ? String(v) + String(u) : String(v));\n        (a.el as any).style[a.prop] = vv;\n      }\n    }`;
  })
  .join("\n")}

${bracketExtracted.styleMapHoles
  .map((h) => {
    return `    {\n      const el = styleMapEls.get(${h.index});\n      if (el) {\n        const prev = styleMapPrev.get(${h.index}) ?? [];\n        for (let i=0;i<prev.length;i++){ try { (el as any).style[prev[i]] = \"\"; } catch {} }\n        const v = (${h.expr}) as any;\n        const keys: string[] = [];\n        if (v && typeof v === \"object\") {\n          for (const k in v) {\n            const val = (v as any)[k];\n            if (val == null || val === false) continue;\n            (el as any).style[k] = String(val);\n            keys.push(k);\n          }\n        }\n        styleMapPrev.set(${h.index}, keys);\n      }\n    }`;
  })
  .join("\n")}

${bracketExtracted.classMapHoles
  .map((h) => {
    return `    {\n      const el = classMapEls.get(${h.index});\n      if (el) {\n        const base = classMapBase.get(${h.index}) ?? \"\";\n        const v = (${h.expr}) as any;\n        if (typeof v === \"string\") {\n          el.className = (base ? base + \" \" : \"\") + v;\n        } else if (Array.isArray(v)) {\n          el.className = (base ? base + \" \" : \"\") + v.filter(Boolean).join(\" \");\n        } else if (v && typeof v === \"object\") {\n          el.className = base;\n          for (const k in v) {\n            if (!!(v as any)[k]) el.classList.add(k);\n          }\n        }\n      }\n    }`;
  })
  .join("\n")}

${selectExtracted.directives
  .map((d) => {
    const valueKeyLit = JSON.stringify(d.valueKey);
    const labelKeyLit = JSON.stringify(d.labelKey);
    return `    {\n      const sel = selectEls.get(${d.index});\n      if (sel) {\n        const items = (${d.itemsExpr}) as any;\n        const arr = Array.isArray(items) ? items : [];\n        const prev = String(sel.value ?? \"\");\n        sel.textContent = \"\";\n        const ph = selectPlaceholders.get(${d.index}) ?? null;\n        if (ph) sel.appendChild(ph.cloneNode(true));\n        for (let ii = 0; ii < arr.length; ii++) {\n          const it = arr[ii];\n          const opt = document.createElement(\"option\");\n          const v = it && typeof it === \"object\" ? (it as any)[${valueKeyLit}] : it;\n          const l = it && typeof it === \"object\" ? (it as any)[${labelKeyLit}] : it;\n          opt.value = v == null ? \"\" : String(v);\n          opt.textContent = l == null ? \"\" : String(l);\n          sel.appendChild(opt);\n        }\n        // restore selection (if possible)\n        if (prev) sel.value = prev;\n      }\n    }`;
  })
  .join("\n")}

${ifBlocksSorted
  .map((b) => {
    const thenSafe = escapeForTemplateLiteral(b.thenHtml);
    const thenBindings = b.thenHoles
      .map((h) => `{ idx: ${h.index}, expr: () => (${h.expr}) as any }`)
      .join(", ");
    const elseSafe = b.elseHtml ? escapeForTemplateLiteral(b.elseHtml) : "";
    const elseBindings = b.elseHoles
      .map((h) => `{ idx: ${h.index}, expr: () => (${h.expr}) as any }`)
      .join(", ");
    const hasElse = b.elseHtml != null;
    return `    {\n      const a = ifAnchors.get(${b.index});\n      if (a) {\n        if (!(a.start as any).isConnected || !(a.end as any).isConnected) {\n          ifAnchors.delete(${b.index});\n          ifPrev.delete(${b.index});\n        } else {\n          const ok = !!(${b.testExpr});\n          const prev = ifPrev.get(${b.index});\n          if (prev !== ok) {\n            ifPrev.set(${b.index}, ok);\n            abeyClearBetween(a.start, a.end);\n            if (ok) {\n              abeyInsertTemplateBefore(a.end, \`${thenSafe}\`, [${thenBindings}]);\n            }${hasElse ? ` else {\n              abeyInsertTemplateBefore(a.end, \`${elseSafe}\`, [${elseBindings}]);\n            }` : ""}\n          }\n        }\n      }\n    }`;
  })
  .join("\n\n")}
    // @if/@else may insert HTML in the same render pass; scan new data-abey-for template anchors before @for work.
    __changed = scanNewBindings() || __changed;

${forBlocksSorted
  .map((b) => {
    const bodySafe = escapeForTemplateLiteral(b.bodyHtml);
    const holeCases = b.bodyHoles
      .map((h) => `          {\n            const host = holeMap.get(${h.index});\n            if (host) abeySetHole(host, (${h.expr}) as any);\n          }`)
      .join("\n");
    return `    {\n      const a = forAnchors.get(${b.index});\n      if (a) {\n        if (!(a.start as any).isConnected || !(a.end as any).isConnected) {\n          forAnchors.delete(${b.index});\n        } else {\n          const items = (${b.listExpr}) as any[];\n          abeyClearBetween(a.start, a.end);\n          const arr = Array.isArray(items) ? items : [];\n          for (let $index = 0; $index < arr.length; $index++) {\n            const ${b.itemVar} = arr[$index];\n            const __tpl = document.createElement(\"template\");\n            __tpl.innerHTML = \`${bodySafe}\`;\n            const frag = __tpl.content.cloneNode(true) as DocumentFragment;\n            const holeMap = new Map<number, HTMLElement>();\n            const tw2 = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT);\n            for (let n = tw2.nextNode() as HTMLElement | null; n; n = tw2.nextNode() as HTMLElement | null) {\n              const raw = n.getAttribute(\"data-abey-hole\");\n              if (raw === null) continue;\n              const idx = raw ? Number(raw) : NaN;\n              if (!Number.isFinite(idx)) continue;\n              holeMap.set(idx, n);\n            }\n${holeCases}\n            a.end.before(frag);\n          }\n        }\n      }\n    }`;
  })
  .join("\n\n")}
      if (!__changed) break;
    }
  };

  render();

  // Events: register once (not on every render).
${bracketExtracted.eventHoles
  .map((h) => {
    const handlerSafe = escapeForTemplateLiteral(h.handlerExpr);
    // Run handler as a statement block — `return (a; b; c)` is invalid when the source uses multiple statements.
    return `  {\n    const a = onEls.get(${h.index});\n    if (a && !onDisposers.has(${h.index})) {\n      const fn = (ev: any) => {\n        const $event = ev;\n        try {\n          ${handlerSafe};\n        } finally {\n          // Event handlers may mutate ctx/state; re-render after the handler.\n          render();\n        }\n      };\n      a.el.addEventListener(a.ev, fn as any);\n      onDisposers.set(${h.index}, () => a.el.removeEventListener(a.ev, fn as any));\n    }\n  }`;
  })
  .join("\n")}

  return {
    render,
    dispose: () => {
      outlet.textContent = "";
      holeEls.clear();
      forAnchors.clear();
      ifAnchors.clear();
      for (const d of Array.from(onDisposers.values())) {
        try { d(); } catch { /* */ }
      }
      onDisposers.clear();
      attrMixEls.clear();
      styleEls.clear();
      styleMapEls.clear();
      styleMapPrev.clear();
      classMapEls.clear();
      classMapBase.clear();
      ifPrev.clear();
      selectEls.clear();
      selectPlaceholders.clear();
    },
  };
}
`.trimStart();

  return { code };
}


