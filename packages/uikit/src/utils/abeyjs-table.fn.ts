import { AbeyTableElement } from "../table/abey-table.js";
import { AbeyTableCell, AbeyTableConfig, AbeyTableStatusTone } from "../table/abey-table.types.js";

export type AbeyTableColumnJson = {
    key: string;
    header?: string;
    width?: string;
    align?: "left" | "center" | "right";
    frozen?: "left" | "right";
    /** global fn path: e.g. "__musicRender.submitter" */
    render?: string;
};

export type AbeyTableActionJson = {
    id: string;
    label: string;
    eventName?: string;
};

export type AbeyTableActionsPayload = {
    actions?: AbeyTableActionJson[];
};

/**
 * Focus inside nested open shadow roots: `document.activeElement` may stop at the host,
 * so caret capture must descend `shadowRoot.activeElement` until the leaf (e.g. table search inside OM).
 */
export function getDeepestActiveElement(doc: Document): Element | null {
    let active: Element | null = doc.activeElement;
    if (!active || active === doc.body || active === doc.documentElement) return active;

    let depth = 0;
    while (depth++ < 32) {
        if (active == null) return active;
        const shadow: ShadowRoot | null | undefined = active.shadowRoot;
        const innerEl: Element | null = shadow?.activeElement ?? null;
        if (!innerEl || innerEl === active) return active;
        active = innerEl;
    }
    return active;
}

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Record<string, string>,
    children?: Array<Node | string | null | undefined>,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (children) {
        for (const c of children) {
            if (c == null) continue;
            node.append(c instanceof Node ? c : document.createTextNode(String(c)));
        }
    }
    return node;
}

export function clear(node: ParentNode) {
    while (node.firstChild) node.firstChild.remove();
}

export function isTemplatePlaceholder(v: string | null): boolean {
    const s = (v ?? "").trim();
    return s.includes("{{") && s.includes("}}");
}

export function getPathValue(obj: any, path: string): unknown {
    const segs = path
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean);
    let cur: any = obj;
    for (const s of segs) {
        if (cur == null) return undefined;
        cur = cur[s];
    }
    return cur;
}

export function interpolateString(tpl: string, row: any): string {
    return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, raw: string) => {
        const v = getPathValue(row, String(raw).trim());
        return v == null ? "" : String(v);
    });
}

/**
 * Valores por defecto en `<img>` de plantillas `data-abey-cell` (lista / thumbs).
 * Respetá atributos ya definidos en el template; con `data-abey-img-manual` no se toca nada.
 */
export function enhanceCellTemplateImages(root: ParentNode): void {
    const imgs = root.querySelectorAll("img");
    for (const img of Array.from(imgs)) {
        if (img.hasAttribute("data-abey-img-manual")) continue;
        if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
        if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
        if (!img.hasAttribute("fetchpriority")) img.setAttribute("fetchpriority", "low");
    }
}

export function renderTemplateFragment(tpl: HTMLTemplateElement, row: any, cellImageDefaults: boolean): DocumentFragment {
    const frag = tpl.content.cloneNode(true) as DocumentFragment;

    const ifNodes = (frag as any).querySelectorAll?.("[data-abey-if]") as NodeListOf<HTMLElement> | undefined;
    if (ifNodes) {
        for (const node of Array.from(ifNodes)) {
            const expr = node.getAttribute("data-abey-if");
            const v = expr ? getPathValue(row, expr.trim()) : undefined;
            if (!v) node.remove();
        }
    }

    const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
        const text = n.textContent ?? "";
        if (!text.includes("{{")) continue;
        n.textContent = interpolateString(text, row);
    }

    const elWalker = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT);
    let e: Node | null;
    while ((e = elWalker.nextNode())) {
        const el = e as Element;
        for (const attr of Array.from(el.attributes)) {
            if (!attr.value.includes("{{")) continue;
            el.setAttribute(attr.name, interpolateString(attr.value, row));
        }
    }

    if (cellImageDefaults) enhanceCellTemplateImages(frag);
    return frag;
}

export function appendTrustedCellContent(host: HTMLElement, value: AbeyTableCell) {
    if (Array.isArray(value)) {
        for (const v of value) appendTrustedCellContent(host, v);
        return;
    }
    if (value == null || value === false) return;
    host.append(value instanceof Node ? value : document.createTextNode(String(value)));
}

export function appendUntrustedCellContent(host: HTMLElement, value: unknown) {
    if (Array.isArray(value)) {
        for (const v of value) appendUntrustedCellContent(host, v);
        return;
    }
    if (value == null || value === false) return;
    if (value instanceof Node) {
        host.append(document.createTextNode(value.textContent ?? ""));
        return;
    }
    host.append(document.createTextNode(String(value)));
}

export function clampText(text: string) {
    return el("span", { class: "cellText" }, [text]);
}

export function parseWidthPx(width?: string): number | null {
    if (!width) return null;
    const m = String(width).trim().match(/^(\d+(?:\.\d+)?)px$/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
}

function createStatusPill(text: string, tone: AbeyTableStatusTone) {
    const pill = el("span", { class: `pill pill--${tone}` }, [text]);
    return pill;
}

export function statusPill(text: string, tone: AbeyTableStatusTone = "neutral") {
    return createStatusPill(text, tone);
}

export function createAbeyTable<Row>(config: AbeyTableConfig<Row>) {
    AbeyTableElement.define("abey-table");
    const el = document.createElement("abey-table") as AbeyTableElement<Row>;
    el.config = config;
    return el;
}

export function avatar(opts: { src?: string; alt?: string; initials?: string }) {
    const host = el("span", { class: "avatar" });
    if (opts.src) {
        const img = document.createElement("img");
        img.src = opts.src;
        img.alt = opts.alt ?? "";
        host.append(img);
        return host;
    }
    host.append(document.createTextNode((opts.initials ?? "").slice(0, 2).toUpperCase()));
    return host;
}