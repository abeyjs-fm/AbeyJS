import { bindText, clearSanitizedHtmlHost, getByPath, setSanitizedHtml } from "./safe-html.js";

const TAG = "abeyjs-view";
const ATTR_FOR = "abeyjs-for";
const ATTR_HTML = "abeyjs-html";

const FOR_RE = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function depthWithin(el: Node, until: Node): number {
  let d = 0;
  let n: Node | null = el;
  while (n && n !== until) {
    d += 1;
    n = n.parentNode;
  }
  return d;
}

function findDeepestOmgxFor(root: Element): Element | null {
  const all = root.querySelectorAll(`[${ATTR_FOR}]`);
  if (all.length === 0) {
    return null;
  }
  let best: Element | null = null;
  let bestD = -1;
  for (const el of Array.from(all)) {
    if (!(el instanceof Element)) {
      continue;
    }
    const d = depthWithin(el, root);
    if (d > bestD) {
      bestD = d;
      best = el;
    }
  }
  return best;
}

function mergeContext(model: object, varName: string, value: unknown): Record<string, unknown> {
  return { ...((isRecord(model) ? model : {}) as Record<string, unknown>), [varName]: value };
}

/**
 * Replace **`{{dotted.path}}`** in text nodes via **`getByPath`** + escape.
 */
function processTextInElement(root: Node, ctx: object): void {
  const list: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((n = w.nextNode()) !== null) {
    if (n.textContent && n.textContent.includes("{{")) {
      list.push(n as Text);
    }
  }
  for (const t of list) {
    t.data = bindText(t.data, ctx);
  }
}

function processOmgxHtml(root: Element, ctx: object): void {
  for (const el of Array.from(root.querySelectorAll(`[${ATTR_HTML}]`))) {
    if (!(el instanceof HTMLElement)) {
      continue;
    }
    const path = (el.getAttribute(ATTR_HTML) ?? "").trim();
    el.removeAttribute(ATTR_HTML);
    if (!path) {
      continue;
    }
    const raw = getByPath(ctx, path);
    const s = raw == null ? "" : String(raw);
    setSanitizedHtml(el, s);
  }
}

function processBindingsOnSubtree(sub: Element, ctx: object): void {
  processTextInElement(sub, ctx);
  processOmgxHtml(sub, ctx);
}

function expandOneOmgxFor(root: Element, model: object): boolean {
  const forEl = findDeepestOmgxFor(root);
  if (!forEl) {
    return false;
  }
  const spec = (forEl.getAttribute(ATTR_FOR) ?? "").trim();
  forEl.removeAttribute(ATTR_FOR);
  const m = spec.match(FOR_RE);
  const parent = forEl.parentNode;
  if (!m || !parent) {
    forEl.remove();
    return true;
  }
  const varName = m[1]!;
  const listKey = m[2]!;
  const list = getByPath(model, listKey);
  const arr = Array.isArray(list) ? (list as unknown[]) : null;
  if (!arr || arr.length === 0) {
    forEl.remove();
    return true;
  }

  for (const item of arr) {
    const clone = forEl.cloneNode(true) as Element;
    const ctx = mergeContext(model, varName, item);
    processBindingsOnSubtree(clone, ctx);
    parent.insertBefore(clone, forEl);
  }
  forEl.remove();
  return true;
}

function runAllOmgxFor(root: Element, model: object): void {
  while (expandOneOmgxFor(root, model)) {
    /* repeat */
  }
}

/**
 * Vistas declarativas en HTML: `<abeyjs-view>`, `{{a.b}}`, `abeyjs-for`, `abeyjs-html`.
 * No se asigna `innerHTML` con cadenas de negocio sin `setSanitizedHtml` / `AbeyJs.sanitize`.
 */
export class AbeyJsViewElement extends HTMLElement {
  #template: DocumentFragment | null = null;

  static get observedAttributes(): string[] {
    return ["name"];
  }

  get name(): string {
    return (this.getAttribute("name") ?? "").trim();
  }

  set name(v: string) {
    this.setAttribute("name", v);
  }

  #model: Record<string, unknown> | null = null;

  get model(): Record<string, unknown> | null {
    return this.#model;
  }

  set model(v: Record<string, unknown> | null) {
    this.#model = v;
    this.#render();
  }

  connectedCallback(): void {
    if (this.#template) {
      return;
    }
    this.#template = document.createDocumentFragment();
    while (this.firstChild) {
      this.#template.appendChild(this.firstChild);
    }
    this.#render();
  }

  disconnectedCallback(): void {
    for (const h of Array.from(this.querySelectorAll(`.abey-html`))) {
      clearSanitizedHtmlHost(h as HTMLElement);
    }
  }

  #render(): void {
    if (!this.#template) {
      return;
    }
    for (const h of Array.from(this.querySelectorAll(`.abey-html`))) {
      clearSanitizedHtmlHost(h as HTMLElement);
    }
    this.replaceChildren();

    const work = this.#template.cloneNode(true) as DocumentFragment;
    const wrap = document.createElement("div");
    wrap.appendChild(work);
    const m = this.#model ?? ({} as Record<string, unknown>);

    if (isRecord(m)) {
      runAllOmgxFor(wrap, m);
    }
    processTextInElement(wrap, m);
    processOmgxHtml(wrap, m);

    for (const ch of Array.from(wrap.childNodes)) {
      this.appendChild(ch);
    }
  }
}

let registered = false;

export function registerAbeyJsView(): void {
  if (typeof customElements === "undefined") {
    return;
  }
  if (registered) {
    return;
  }
  registered = true;
  if (!customElements.get(TAG)) {
    customElements.define(TAG, AbeyJsViewElement);
  }
}
