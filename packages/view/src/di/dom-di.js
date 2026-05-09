const PROVIDER_CACHE = new WeakMap();
function resolveGlobalPath(path) {
    const parts = path.split(".").filter(Boolean);
    let cur = globalThis;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object")
            return undefined;
        cur = cur[p];
    }
    return cur;
}
function parseJsonLoose(raw) {
    const s = raw.trim();
    if (!s)
        return undefined;
    try {
        return JSON.parse(s);
    }
    catch {
        // fallback: string literal sin JSON
        return s;
    }
}
function getProviderDef(el) {
    const token = (el.getAttribute("token") ?? "").trim();
    if (!token)
        return null;
    const valueAttr = el.getAttribute("use-value");
    if (valueAttr != null) {
        return { token, def: { kind: "value", value: parseJsonLoose(valueAttr) } };
    }
    const factoryPath = (el.getAttribute("use-factory") ?? "").trim();
    if (factoryPath) {
        const fn = resolveGlobalPath(factoryPath);
        if (typeof fn === "function") {
            return { token, def: { kind: "factory", factory: fn } };
        }
        return { token, def: { kind: "factory", factory: () => undefined } };
    }
    return { token, def: { kind: "value", value: undefined } };
}
function computeProviderValue(el, token) {
    if (PROVIDER_CACHE.has(el))
        return PROVIDER_CACHE.get(el);
    const meta = getProviderDef(el);
    if (!meta)
        return undefined;
    let v = undefined;
    if (meta.def.kind === "value") {
        v = meta.def.value;
    }
    else {
        v = meta.def.factory({ host: el, token });
    }
    // No cachear `undefined`: permite que factories dependientes de runtime se resuelvan cuando aparezca.
    if (v !== undefined) {
        PROVIDER_CACHE.set(el, v);
    }
    return v;
}
/**
 * Resuelve un token buscando el provider más cercano hacia arriba en el DOM:
 * `<abey-provide token="x" ...>` dentro de scopes/containers.
 */
export function injectFromDom(tokenRaw, from) {
    const token = tokenRaw.trim();
    if (!token) {
        throw new Error("injectFromDom: token vacío.");
    }
    const selector = `abey-provide[token="${CSS.escape(token)}"]`;
    // 1) Provider local (dentro del propio componente / subtree)
    const local = from.querySelector?.(selector) ?? null;
    // 2) Provider en el scope (hacia arriba)
    const provider = local ?? from.closest(selector) ?? from.parentElement?.closest(selector) ?? null;
    if (!provider) {
        throw new Error(`injectFromDom: no se encontró provider para "${token}".`);
    }
    return computeProviderValue(provider, token);
}
export function tryInjectFromDom(tokenRaw, from) {
    try {
        return injectFromDom(tokenRaw, from);
    }
    catch {
        return undefined;
    }
}
export class AbeyProvideElement extends HTMLElement {
    static get observedAttributes() {
        return ["token", "use-value", "use-factory"];
    }
    connectedCallback() {
        this.setAttribute("data-abey-provide", "1");
    }
    attributeChangedCallback() {
        // invalidate cache
        PROVIDER_CACHE.delete(this);
    }
    static define(tagName = "abey-provide") {
        if (!customElements.get(tagName)) {
            customElements.define(tagName, AbeyProvideElement);
        }
    }
}
