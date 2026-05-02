import {
  getDocSearchCatalog,
  searchDocItems,
  type DocSearchItem,
} from "./doc-search-index.js";

/** Mounts DOM + search behavior (landing / **`appBarInset`**). Returns **`dispose`** (aborts listeners). */
export function attachDocSiteSearch(
  container: HTMLElement,
  navigate: (pathname: string) => void,
  options?: { maxHits?: number },
): () => void {
  container.textContent = "";
  container.classList.add("doc-find");
  container.classList.toggle("doc-find--shell", container.classList.contains("doc-site-appbar-search-host"));

  const wrap = document.createElement("div");
  wrap.className = "doc-find__wrap";

  const form = document.createElement("form");
  form.className = "doc-find__form";
  form.setAttribute("role", "search");
  form.setAttribute("aria-label", "Search documentation");
  form.autocomplete = "off";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "doc-find__submit";
  submitBtn.tabIndex = -1;
  submitBtn.setAttribute("aria-label", "Search");
  submitBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';

  const input = document.createElement("input");
  input.type = "search";
  input.name = "docSearch";
  input.className = "doc-find__input";
  input.spellcheck = false;
  input.placeholder = "Search documentation…";
  input.autocomplete = "off";
  input.autocapitalize = "off";
  input.setAttribute("autocorrect", "off");

  const kbd = document.createElement("kbd");
  kbd.className = "doc-find__kbd";
  kbd.setAttribute("aria-hidden", "true");
  const kCtrl = document.createElement("span");
  kCtrl.textContent = "Ctrl";
  const kK = document.createElement("span");
  kK.textContent = "K";
  kbd.append(kCtrl, document.createTextNode(" "), kK);

  form.append(submitBtn, input, kbd);

  const panel = document.createElement("div");
  panel.className = "doc-find__panel";
  panel.hidden = true;

  const hitlist = document.createElement("ul");
  hitlist.className = "doc-find__hitlist";
  hitlist.setAttribute("aria-label", "Results");

  const empty = document.createElement("p");
  empty.className = "doc-find__msg";
  empty.hidden = true;
  empty.innerHTML =
    'No matches. Try another term or open the <a href="/guides">guides index</a>.';

  panel.append(hitlist, empty);
  wrap.append(form, panel);
  container.append(wrap);

  const rootEl = wrap;
  const maxHits = options?.maxHits ?? 12;
  let focusSearch = false;

  const ac = new AbortController();
  const { signal } = ac;

  const catalog = (): DocSearchItem[] => getDocSearchCatalog();

  const hitsFor = (): DocSearchItem[] => searchDocItems(catalog(), input.value, maxHits);

  const renderHits = (items: DocSearchItem[]): void => {
    hitlist.replaceChildren(
      ...items.map((it) => {
        const li = document.createElement("li");
        li.className = "doc-find__hit";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "doc-find__hit-main";
        const title = document.createElement("span");
        title.className = "doc-find__hit-title";
        title.textContent = it.title;
        btn.append(title);
        if (it.hint && it.hint !== it.title) {
          const h = document.createElement("span");
          h.className = "doc-find__hit-hint";
          h.textContent = it.hint;
          btn.append(h);
        }
        const meta = document.createElement("span");
        meta.className = "doc-find__hit-meta";
        meta.textContent = it.href;
        btn.append(meta);
        btn.addEventListener(
          "click",
          (): void => {
            navigate(it.href.startsWith("/") ? it.href : `/${it.href}`);
          },
          { signal },
        );
        li.append(btn);
        return li;
      }),
    );
  };

  const apply = (): void => {
    const q = input.value.trim();
    if (!focusSearch || q.length === 0) {
      panel.hidden = true;
      input.removeAttribute("aria-expanded");
      return;
    }
    const items = hitsFor();
    panel.hidden = false;
    empty.hidden = items.length > 0;
    renderHits(items);
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener(
    "focus",
    (): void => {
      focusSearch = true;
      apply();
    },
    { signal },
  );

  input.addEventListener(
    "blur",
    (e: FocusEvent): void => {
      const rt = e.relatedTarget;
      queueMicrotask(() => {
        if (rt instanceof Node && rootEl.contains(rt)) return;
        const ae = document.activeElement;
        if (ae instanceof Node && rootEl.contains(ae)) return;
        focusSearch = false;
        apply();
      });
    },
    { signal },
  );

  panel.addEventListener("mousedown", (e: MouseEvent): void => e.preventDefault(), { signal });

  input.addEventListener("input", apply, { signal });

  input.addEventListener(
    "keydown",
    (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        panel.hidden = true;
        focusSearch = false;
        input.removeAttribute("aria-expanded");
        input.blur();
      }
    },
    { signal },
  );

  form.addEventListener(
    "submit",
    (e: Event): void => {
      e.preventDefault();
      const items = hitsFor();
      const top = items[0];
      if (top) navigate(top.href.startsWith("/") ? top.href : `/${top.href}`);
    },
    { signal },
  );

  document.addEventListener(
    "pointerdown",
    (e: PointerEvent): void => {
      if (!panel.hidden && !composedPathIncludes(e.composedPath(), wrap)) {
        panel.hidden = true;
        focusSearch = false;
        input.removeAttribute("aria-expanded");
      }
    },
    { signal, capture: true },
  );

  document.addEventListener(
    "keydown",
    (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      if ((!e.ctrlKey && !e.metaKey) || k !== "k" || e.altKey || e.repeat) return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      e.preventDefault();
      input.focus();
      input.select();
    },
    { signal },
  );

  return (): void => {
    ac.abort();
  };
}

function composedPathIncludes(path: EventTarget[], needle: HTMLElement): boolean {
  for (const node of path) {
    if (node === needle) return true;
    if (typeof Node !== "undefined" && node instanceof Node && needle.contains(node)) return true;
  }
  return false;
}
