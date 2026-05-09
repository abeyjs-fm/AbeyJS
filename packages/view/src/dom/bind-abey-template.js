import { tryInjectFromDom } from "../di/dom-di.js";
import { intentOf } from "@abeyjs/core";
function compileExpr(exprRaw) {
    const expr = exprRaw.trim();
    // eslint-disable-next-line no-new-func
    return new Function("ctx", `try { with (ctx) { return (${expr}); } } catch { return undefined; }`);
}
/** For `(event)="..."` — may be multiple statements; `return (a; b)` would be invalid. */
function compileEventHandler(exprRaw) {
    const expr = exprRaw.trim();
    // eslint-disable-next-line no-new-func
    return new Function("ctx", `try { with (ctx) { ${expr}; } } catch { return undefined; }`);
}
function parseMustache(input) {
    const out = [];
    const re = /\{\{\s*([\s\S]+?)\s*\}\}/g;
    let last = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const m = re.exec(input);
        if (!m)
            break;
        const start = m.index;
        if (start > last)
            out.push({ kind: "text", value: input.slice(last, start) });
        out.push({ kind: "expr", expr: m[1] });
        last = start + m[0].length;
    }
    if (last < input.length)
        out.push({ kind: "text", value: input.slice(last) });
    return out;
}
function normalizeAttrValue(v) {
    if (v == null)
        return "";
    return typeof v === "string" ? v : String(v);
}
function evalMustacheString(raw, evalExpr) {
    if (!raw.includes("{{"))
        return raw;
    const segs = parseMustache(raw);
    if (segs.every((s) => s.kind === "text"))
        return raw;
    let out = "";
    for (const seg of segs) {
        if (seg.kind === "text")
            out += seg.value;
        else
            out += normalizeAttrValue(evalExpr(seg.expr));
    }
    return out;
}
function defaultContext(host, runtime, state, getEvent) {
    // Context dinámico: no "snapshot" de `state` (necesario para que `{{ lastPreview }}` se actualice).
    const helpers = {
        $el: host,
        formStore: (path) => {
            const from = host.closest?.("abey-form");
            return from?.getStoreValue ? from.getStoreValue(path) : undefined;
        },
        json: (v, space = 2) => JSON.stringify(v, null, space),
        inject: (token) => tryInjectFromDom(token, host),
        dispatchIntent: (name, payload) => {
            const n = String(name ?? "").trim();
            if (!n || !runtime || typeof runtime.dispatch !== "function")
                return;
            void runtime.dispatch(intentOf(n, payload), { source: "abey-component" });
        },
    };
    return new Proxy(helpers, {
        get(_target, prop) {
            if (prop === "state")
                return state;
            if (prop === "$event")
                return getEvent();
            if (prop in helpers)
                return helpers[prop];
            return state[prop];
        },
        has(_target, prop) {
            if (prop === "state")
                return true;
            if (prop === "$event")
                return true;
            return prop in helpers || prop in state;
        },
        ownKeys() {
            const keys = new Set();
            keys.add("state");
            keys.add("$event");
            for (const k of Reflect.ownKeys(helpers))
                keys.add(k);
            for (const k of Reflect.ownKeys(state))
                keys.add(k);
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
                return { configurable: true, enumerable: true, writable: false, value: helpers[prop] };
            }
            if (Object.prototype.hasOwnProperty.call(state, prop)) {
                return { configurable: true, enumerable: true, writable: true, value: state[prop] };
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
export function bindAbeyTemplate(root, ctx) {
    const runtime = ctx.runtime ?? null;
    const state = (ctx.state ?? {});
    const updates = [];
    const unsubs = [];
    const ctxFor = (el, ev) => {
        return defaultContext(el ?? root, runtime, state, () => ev);
    };
    // Text nodes
    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const n = textWalker.nextNode();
        if (!n)
            break;
        textNodes.push(n);
    }
    for (const tn of textNodes) {
        if (tn.parentElement?.closest("pre, code")) {
            continue;
        }
        const raw = tn.nodeValue ?? "";
        if (!raw.includes("{{"))
            continue;
        const segs = parseMustache(raw);
        if (segs.every((s) => s.kind === "text"))
            continue;
        const frag = document.createDocumentFragment();
        const exprNodes = [];
        for (const seg of segs) {
            if (seg.kind === "text") {
                frag.appendChild(document.createTextNode(seg.value));
            }
            else {
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
                if (e.node.nodeValue !== v)
                    e.node.nodeValue = v;
            }
        });
    }
    // Element attrs
    const elWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const els = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const n = elWalker.nextNode();
        if (!n)
            break;
        els.push(n);
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
                    if (!next)
                        el.removeAttribute(name);
                    else if (el.getAttribute(name) !== next)
                        el.setAttribute(name, next);
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
                        if (v)
                            el.setAttribute("hidden", "");
                        else
                            el.removeAttribute("hidden");
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
                        if (!v)
                            el.removeAttribute(attrName);
                        else
                            el.setAttribute(attrName, v);
                    });
                    continue;
                }
            }
            if (name.startsWith("(") && name.endsWith(")")) {
                const evName = name.slice(1, -1).trim();
                const handlerExpr = value;
                el.removeAttribute(name);
                const fn = compileEventHandler(handlerExpr);
                const onEv = (ev) => {
                    fn(ctxFor(el, ev));
                    render();
                };
                el.addEventListener(evName, onEv);
                unsubs.push(() => el.removeEventListener(evName, onEv));
            }
        }
    }
    const render = () => {
        for (const u of updates)
            u();
    };
    render();
    return {
        render,
        dispose: () => {
            for (const u of unsubs)
                u();
            updates.length = 0;
            unsubs.length = 0;
        },
    };
}
