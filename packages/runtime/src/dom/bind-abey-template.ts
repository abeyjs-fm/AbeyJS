import { tryInjectFromDom } from "../di/dom-di.js";
import { intentOf } from "@abeyjs/core";
import type { OmegaRuntime } from "../runtime.js";

export type AbeyTemplateContext = {
  runtime?: OmegaRuntime | null;
  state?: Record<string, unknown>;
  element?: Element;
};

export type BoundTemplate = {
  render(): void;
  dispose(): void;
};

type BindingUpdate = () => void;

function compileExpr<T = unknown>(exprRaw: string): (ctx: Record<string, unknown>) => T {
  const expr = exprRaw.trim();
  // eslint-disable-next-line no-new-func
  return new Function(
    "ctx",
    `try { with (ctx) { return (${expr}); } } catch { return undefined; }`,
  ) as (ctx: Record<string, unknown>) => T;
}

/** For `(event)="..."` — may be multiple statements; `return (a; b)` would be invalid. */
function compileEventHandler(exprRaw: string): (ctx: Record<string, unknown>) => unknown {
  const expr = exprRaw.trim();
  // eslint-disable-next-line no-new-func
  return new Function(
    "ctx",
    `try { with (ctx) { ${expr}; } } catch { return undefined; }`,
  ) as (ctx: Record<string, unknown>) => unknown;
}

function parseMustache(input: string): Array<{ kind: "text"; value: string } | { kind: "expr"; expr: string }> {
  const out: Array<{ kind: "text"; value: string } | { kind: "expr"; expr: string }> = [];
  const re = /\{\{\s*([\s\S]+?)\s*\}\}/g;
  let last = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const m = re.exec(input);
    if (!m) break;
    const start = m.index;
    if (start > last) out.push({ kind: "text", value: input.slice(last, start) });
    out.push({ kind: "expr", expr: m[1]! });
    last = start + m[0].length;
  }
  if (last < input.length) out.push({ kind: "text", value: input.slice(last) });
  return out;
}

function normalizeAttrValue(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

function evalMustacheString(raw: string, evalExpr: (expr: string) => unknown): string {
  if (!raw.includes("{{")) return raw;
  const segs = parseMustache(raw);
  if (segs.every((s) => s.kind === "text")) return raw;
  let out = "";
  for (const seg of segs) {
    if (seg.kind === "text") out += seg.value;
    else out += normalizeAttrValue(evalExpr(seg.expr));
  }
  return out;
}

function defaultContext(
  host: Element,
  runtime: OmegaRuntime | null,
  state: Record<string, unknown>,
  getEvent: () => Event | undefined,
): Record<string, unknown> {
  // Context dinámico: no "snapshot" de `state` (necesario para que `{{ lastPreview }}` se actualice).
  const helpers: Record<string, unknown> = {
    $el: host,
    formStore: (path: string) => {
      const from = host.closest?.("abey-form") as any;
      return from?.getStoreValue ? from.getStoreValue(path) : undefined;
    },
    json: (v: unknown, space = 2) => JSON.stringify(v, null, space),
    inject: (token: string) => tryInjectFromDom(token, host),
    dispatchIntent: (name: string, payload: unknown) => {
      const n = String(name ?? "").trim();
      if (!n || !runtime || typeof (runtime as any).dispatch !== "function") return;
      void (runtime as any).dispatch(intentOf(n, payload), { source: "abey-component" });
    },
  };

  return new Proxy(helpers, {
    get(_target, prop) {
      if (prop === "state") return state;
      if (prop === "$event") return getEvent();
      if (prop in helpers) return (helpers as any)[prop];
      return (state as any)[prop as any];
    },
    has(_target, prop) {
      if (prop === "state") return true;
      if (prop === "$event") return true;
      return prop in helpers || prop in (state as any);
    },
    ownKeys() {
      const keys = new Set<string | symbol>();
      keys.add("state");
      keys.add("$event");
      for (const k of Reflect.ownKeys(helpers)) keys.add(k);
      for (const k of Reflect.ownKeys(state)) keys.add(k);
      return Array.from(keys);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (prop === "state") {
        return { configurable: true, enumerable: true, writable: false, value: state };
      }
      if (prop === "$event") {
        return { configurable: true, enumerable: true, writable: false, value: getEvent() };
      }
      if (Object.prototype.hasOwnProperty.call(helpers, prop)) {
        return { configurable: true, enumerable: true, writable: false, value: (helpers as any)[prop] };
      }
      if (Object.prototype.hasOwnProperty.call(state, prop)) {
        return { configurable: true, enumerable: true, writable: true, value: (state as any)[prop as any] };
      }
      return undefined;
    },
  });
}

/**
 * Bindea un subtree existente (no escribe innerHTML) con:
 * - `{{ expr }}` en text nodes
 * - `[hidden]`, `[class.foo]`, `[attr.x]`
 * - `(event)` handlers con expresiones
 * - `{{ }}` dentro de atributos normales
 * - No bindea dentro de descendientes `@pre,code` (literales OM en código / docs).
 */
export function bindAbeyTemplate(root: Element, ctx: AbeyTemplateContext): BoundTemplate {
  const runtime = ctx.runtime ?? null;
  const state = (ctx.state ?? {}) as Record<string, unknown>;

  const updates: BindingUpdate[] = [];
  const unsubs: Array<() => void> = [];

  const ctxFor = (el?: Element, ev?: Event): Record<string, unknown> => {
    return defaultContext(el ?? root, runtime, state, () => ev);
  };

  // Text nodes
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = textWalker.nextNode();
    if (!n) break;
    textNodes.push(n as Text);
  }
  for (const tn of textNodes) {
    if (tn.parentElement?.closest("pre, code")) {
      continue;
    }
    const raw = tn.nodeValue ?? "";
    if (!raw.includes("{{")) continue;
    const segs = parseMustache(raw);
    if (segs.every((s) => s.kind === "text")) continue;
    const frag = document.createDocumentFragment();
    const exprNodes: Array<{ node: Text; eval: (ctx: Record<string, unknown>) => unknown }> = [];
    for (const seg of segs) {
      if (seg.kind === "text") {
        frag.appendChild(document.createTextNode(seg.value));
      } else {
        const node = document.createTextNode("");
        frag.appendChild(node);
        exprNodes.push({ node, eval: compileExpr(seg.expr) });
      }
    }
    tn.parentNode?.replaceChild(frag, tn);
    updates.push(() => {
      const c = ctxFor();
      for (const e of exprNodes) {
        const v = normalizeAttrValue(e.eval(c));
        if (e.node.nodeValue !== v) e.node.nodeValue = v;
      }
    });
  }

  // Element attrs
  const elWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const els: Element[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = elWalker.nextNode();
    if (!n) break;
    els.push(n as Element);
  }
  for (const el of els) {
    if (el.closest("pre, code")) {
      continue;
    }
    const attrs = Array.from(el.attributes);
    for (const a of attrs) {
      const name = a.name.trim();
      const value = a.value ?? "";

      if (value.includes("{{")) {
        const raw = value;
        updates.push(() => {
          const c = ctxFor(el);
          const next = evalMustacheString(raw, (e) => compileExpr(e)(c));
          if (!next) el.removeAttribute(name);
          else if (el.getAttribute(name) !== next) el.setAttribute(name, next);
        });
        continue;
      }

      if (name.startsWith("[") && name.endsWith("]")) {
        const key = name.slice(1, -1).trim();
        const evalExpr = compileExpr(value);
        el.removeAttribute(name);
        if (key === "hidden") {
          updates.push(() => {
            const v = !!evalExpr(ctxFor(el));
            if (v) el.setAttribute("hidden", "");
            else el.removeAttribute("hidden");
          });
          continue;
        }
        if (key.startsWith("class.")) {
          const cls = key.slice("class.".length).trim();
          updates.push(() => {
            const on = !!evalExpr(ctxFor(el));
            el.classList.toggle(cls, on);
          });
          continue;
        }
        if (key.startsWith("attr.")) {
          const attrName = key.slice("attr.".length).trim();
          updates.push(() => {
            const v = normalizeAttrValue(evalExpr(ctxFor(el)));
            if (!v) el.removeAttribute(attrName);
            else el.setAttribute(attrName, v);
          });
          continue;
        }
      }

      if (name.startsWith("(") && name.endsWith(")")) {
        const evName = name.slice(1, -1).trim();
        const handlerExpr = value;
        el.removeAttribute(name);
        const fn = compileEventHandler(handlerExpr);
        const onEv = (ev: Event): void => {
          fn(ctxFor(el, ev));
          render();
        };
        el.addEventListener(evName, onEv);
        unsubs.push(() => el.removeEventListener(evName, onEv));
      }
    }
  }

  const render = (): void => {
    for (const u of updates) u();
  };
  render();

  return {
    render,
    dispose: () => {
      for (const u of unsubs) u();
      updates.length = 0;
      unsubs.length = 0;
    },
  };
}
