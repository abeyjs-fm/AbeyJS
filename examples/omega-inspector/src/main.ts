import type { OmegaInspectorWireMsg } from "@abeyjs/inspector/app";
import type { RuntimeTraceEvent } from "@abeyjs/runtime";
import "./style.css";

const elHubUrl = document.getElementById("hubUrl") as HTMLInputElement;
const elAppId = document.getElementById("appId") as HTMLInputElement;
const elFilter = document.getElementById("filter") as HTMLInputElement;
const elBtn = document.getElementById("btnConnect") as HTMLButtonElement;
const elStatus = document.getElementById("status") as HTMLDivElement;
const elEvents = document.getElementById("events") as HTMLDivElement;
const elDetails = document.getElementById("details") as HTMLPreElement;
const elKvHub = document.getElementById("kvHub") as HTMLDivElement;
const elKvApp = document.getElementById("kvApp") as HTMLDivElement;
const elKvCount = document.getElementById("kvCount") as HTMLDivElement;
const elKvLast = document.getElementById("kvLast") as HTMLDivElement;
const elBtnSnap = document.getElementById("btnSnap") as HTMLButtonElement;
const elBtnClear = document.getElementById("btnClear") as HTMLButtonElement;
const elBtnPause = document.getElementById("btnPause") as HTMLButtonElement;
const elBtnCopy = document.getElementById("btnCopy") as HTMLButtonElement;
const elBtnExport = document.getElementById("btnExport") as HTMLButtonElement;
const elChkAutoSnap = document.getElementById("chkAutoSnap") as HTMLInputElement;
const elChkAutoScroll = document.getElementById("chkAutoScroll") as HTMLInputElement;
const elChkOnlyNet = document.getElementById("chkOnlyNet") as HTMLInputElement;
const elBtnNewer = document.getElementById("btnNewer") as HTMLButtonElement;
const elBtnOlder = document.getElementById("btnOlder") as HTMLButtonElement;
const elPageInfo = document.getElementById("pageInfo") as HTMLDivElement;
const elTabAll = document.getElementById("tabAll") as HTMLButtonElement;
const elTabNav = document.getElementById("tabNav") as HTMLButtonElement;
const elTabNet = document.getElementById("tabNet") as HTMLButtonElement;

type UiEvent = RuntimeTraceEvent & { _id: string };

let ws: WebSocket | null = null;
let items: UiEvent[] = [];
let activeId: string | null = null;
let filterRe: RegExp | null = null;
let paused = false;
let page = 0;
const pageSize = 20;
type ViewMode = "all" | "nav" | "net";
let mode: ViewMode = "all";

const fmtTime = (ts: number) => {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour12: false });
  } catch {
    return String(ts);
  }
};

function setConnected(ok: boolean): void {
  elStatus.dataset.ok = ok ? "true" : "false";
  elStatus.textContent = ok ? "CONNECTED" : "DISCONNECTED";
}

function updateKv(): void {
  elKvHub.textContent = elHubUrl.value.trim() || "-";
  elKvApp.textContent = elAppId.value.trim() || "-";
  elKvCount.textContent = String(items.length);
  const last = items[items.length - 1];
  elKvLast.textContent = last ? `${fmtTime(last.timestamp)} · ${last.name}` : "-";
}

function applyFilter(): void {
  const raw = elFilter.value.trim();
  if (!raw) {
    filterRe = null;
    page = 0;
    render();
    return;
  }
  try {
    filterRe = new RegExp(raw, "i");
  } catch {
    filterRe = null;
  }
  page = 0;
  render();
}

function isNetwork(ev: RuntimeTraceEvent): boolean {
  const n = String(ev?.name ?? "");
  if (n.startsWith("omega/http:")) return true;
  const d: any = (ev as any)?.data;
  if (d && (d.network === true || d.url || d.status || d.method)) return true;
  return false;
}

function isNav(ev: RuntimeTraceEvent): boolean {
  const n = String(ev?.name ?? "");
  return n.startsWith("omega/nav:");
}

function visibleEvents(): UiEvent[] {
  const base = filterRe ? items.filter((i) => filterRe!.test(i.name)) : items;
  const byMode =
    mode === "nav" ? base.filter((i) => isNav(i)) : mode === "net" ? base.filter((i) => isNetwork(i)) : base;
  return elChkOnlyNet.checked ? byMode.filter((i) => isNetwork(i)) : byMode;
}

function render(): void {
  const frag = document.createDocumentFragment();
  const visible = visibleEvents();
  const rev = visible.slice().reverse(); // newest-first
  const pageCount = Math.max(1, Math.ceil(rev.length / pageSize));
  if (page < 0) page = 0;
  if (page > pageCount - 1) page = pageCount - 1;
  const start = page * pageSize;
  const pageItems = rev.slice(start, start + pageSize);

  for (const ev of pageItems) {
    const row = document.createElement("div");
    row.className = "evRow";
    row.dataset.active = ev._id === activeId ? "true" : "false";
    row.dataset.net = isNetwork(ev) ? "true" : "false";

    const ts = document.createElement("div");
    ts.className = "ts";
    ts.textContent = fmtTime(ev.timestamp);

    const body = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = ev.name;
    const meta = document.createElement("div");
    meta.className = "muted";
    meta.textContent = `${ev.source ?? "-"} · ${ev.correlationId}`;
    if (isNav(ev)) {
      const tag = document.createElement("div");
      tag.className = "tag";
      tag.textContent = "NAV";
      body.appendChild(tag);
    } else if (isNetwork(ev)) {
      const tag = document.createElement("div");
      tag.className = "tag tag--net";
      tag.textContent = "NET";
      body.appendChild(tag);
    }
    body.appendChild(name);
    body.appendChild(meta);

    row.appendChild(ts);
    row.appendChild(body);
    row.addEventListener("click", () => {
      activeId = ev._id;
      elDetails.textContent = JSON.stringify(ev, null, 2);
      render();
    });
    frag.appendChild(row);
  }

  elEvents.innerHTML = "";
  elEvents.appendChild(frag);
  updateKv();
  elPageInfo.textContent = `Page ${page + 1}/${pageCount}`;
  elBtnNewer.disabled = page <= 0;
  elBtnOlder.disabled = page >= pageCount - 1;
  if (!paused && elChkAutoScroll.checked && page === 0) elEvents.scrollTop = 0;
}

function addEvent(ev: RuntimeTraceEvent): void {
  if (paused) return;
  const _id = `${ev.timestamp}:${ev.correlationId}:${Math.random().toString(16).slice(2)}`;
  items.push({ ...ev, _id });
  if (items.length > 3000) items = items.slice(-3000);
  if (elChkAutoScroll.checked) page = 0;
  render();
}

function wsSend(msg: OmegaInspectorWireMsg): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function connect(): void {
  const url = elHubUrl.value.trim();
  const appId = elAppId.value.trim() || "default";
  if (!url) return;

  if (ws) {
    try {
      ws.close();
    } catch {
      /* */
    }
    ws = null;
  }

  setConnected(false);
  elDetails.textContent = "{}";
  activeId = null;
  updateKv();

  ws = new WebSocket(url);
  ws.addEventListener("open", () => {
    wsSend({ type: "hello", role: "inspector", appId });
    setConnected(true);
    updateKv();
    if (elChkAutoSnap.checked) {
      wsSend({ type: "trace/snapshot", limit: 600 });
    }
  });
  ws.addEventListener("close", () => setConnected(false));
  ws.addEventListener("error", () => setConnected(false));
  ws.addEventListener("message", (m) => {
    let parsed: any = null;
    try {
      parsed = JSON.parse(String((m as MessageEvent).data ?? ""));
    } catch {
      return;
    }
    const t = parsed?.type;
    if (t === "trace") {
      addEvent(parsed.ev as RuntimeTraceEvent);
      return;
    }
    if (t === "trace/snapshot") {
      const arr = Array.isArray(parsed.items) ? (parsed.items as RuntimeTraceEvent[]) : [];
      for (const ev of arr) addEvent(ev);
      return;
    }
  });
}

elBtn.addEventListener("click", () => connect());
elBtnSnap.addEventListener("click", () => wsSend({ type: "trace/snapshot", limit: 400 }));
elBtnClear.addEventListener("click", () => {
  items = [];
  activeId = null;
  elDetails.textContent = "{}";
  render();
});
elBtnPause.addEventListener("click", () => {
  paused = !paused;
  elBtnPause.textContent = paused ? "Resume" : "Pause";
  elBtnPause.dataset.on = paused ? "true" : "false";
});
elBtnCopy.addEventListener("click", async () => {
  const txt = elDetails.textContent || "{}";
  try {
    await navigator.clipboard.writeText(txt);
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
});
elBtnExport.addEventListener("click", () => {
  const visible = visibleEvents();
  const payload = JSON.stringify(visible, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const a = document.createElement("a");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = URL.createObjectURL(blob);
  a.download = `abeyjs-inspector-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
});
elFilter.addEventListener("input", () => applyFilter());
elChkOnlyNet.addEventListener("change", () => {
  page = 0;
  render();
});
elBtnNewer.addEventListener("click", () => {
  page = Math.max(0, page - 1);
  render();
});
elBtnOlder.addEventListener("click", () => {
  page = page + 1;
  render();
});

function setMode(next: ViewMode): void {
  mode = next;
  elTabAll.dataset.on = mode === "all" ? "true" : "false";
  elTabNav.dataset.on = mode === "nav" ? "true" : "false";
  elTabNet.dataset.on = mode === "net" ? "true" : "false";
  page = 0;
  render();
}

elTabAll.addEventListener("click", () => setMode("all"));
elTabNav.addEventListener("click", () => setMode("nav"));
elTabNet.addEventListener("click", () => setMode("net"));

// Defaults
elHubUrl.value = "ws://127.0.0.1:7071";
elAppId.value = "mymuisic-dev";
elBtnPause.dataset.on = "false";
setMode("all");
render();

