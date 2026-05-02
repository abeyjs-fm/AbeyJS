import { intentOf } from "@abeyjs/core";
import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app-alumnos.view.html";
import alumnosCssUrl from "./app-alumnos.css?url";
import { AlumnosEcosystem } from "../omega/semantics.js";
import type { Alumno, AlumnosInvalidPayload } from "../model/alumnos.types.js";
import { AlumnoEntity, normalizeAlumno, validateAlumno } from "../model/alumnos.types.js";
import {
  classToAbeyFormConfig,
  AbeyFormElement,
  AbeyTableElement,
} from "@abeyjs/uikit";
import type { FormSlice } from "@abeyjs/uikit";
import type { FieldSelectOptions } from "@abeyjs/uikit";

function formatWhen(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function createReqId(): string {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function sliceFor(values: Record<string, unknown>, mode: FormSlice["mode"]): FormSlice {
  return { value: values, status: "idle", mode };
}

function clearedValues(): Record<string, unknown> {
  return { nombres: "", email: "", edad: 0, grado: "", artistaFavoritoId: "" };
}

@AbeyComponent({
  selector: "app-alumnos",
  template,
  stylesHrefs: [alumnosCssUrl],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppAlumnosElement extends AbeyComponentElement {
  #table: AbeyTableElement<Alumno> | null = null;
  #form: AbeyFormElement | null = null;
  #editingId = "";
  #alumnos: Alumno[] = [];
  #onRootClickBound: ((ev: MouseEvent) => void) | null = null;
  #tableWired = false;
  #formWired = false;
  #retryWireTableQueued = false;
  #bootRetries = 0;
  #bootTimer: number | null = null;
  #booted = false;

  constructor() {
    super();
    this.state = {
      banner: { text: "", tone: "idle" as "idle" | "ok" | "err" },
      editingId: "",
      stats: { count: 0, lastChangeAt: 0, lastChangeLabel: "" },
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#mount();
      this.#boot();
    });
  }

  #boot(): void {
    if (this.#booted) return;
    const runtime = this.runtime;
    const channel = (this as any).channel?.() as any;
    if (!runtime || !channel?.on) {
      const maxRetries = 30;
      if (this.#bootRetries < maxRetries) {
        this.#bootRetries += 1;
        if (this.#bootTimer != null) window.clearTimeout(this.#bootTimer);
        this.#bootTimer = window.setTimeout(() => {
          this.#bootTimer = null;
          if (!this.isConnected) return;
          this.#boot();
        }, 50);
      }
      return;
    }
    this.#booted = true;
    this.#wireChannel();
    this.#initData();
    this.onDestroy(() => {
      if (this.#bootTimer != null) window.clearTimeout(this.#bootTimer);
      this.#bootTimer = null;
    });
  }

  #mount(): void {
    this.#wireTable();
    this.#wireForm();

    const root = (this as any).elByRole?.("alumnos-root") as HTMLElement | null;
    if (root) {
      this.#onRootClickBound = (ev: MouseEvent) => this.#onRootClick(ev);
      root.addEventListener("click", this.#onRootClickBound);
      this.onDestroy(() => {
        if (this.#onRootClickBound) root.removeEventListener("click", this.#onRootClickBound);
      });
    }
  }

  #wireTable(): void {
    if (this.#tableWired) return;
    AbeyTableElement.define("abey-table");
    const byRole = (((this as any).elByRole?.("alumnos-table") as AbeyTableElement<Alumno> | null) ?? null) as
      | AbeyTableElement<Alumno>
      | null;
    const tbl =
      byRole ?? ((this.querySelector('abey-table[data-role="alumnos-table"]') as AbeyTableElement<Alumno> | null) ?? null);
    this.#table = tbl;
    if (!tbl) {
      if (!this.#retryWireTableQueued) {
        this.#retryWireTableQueued = true;
        queueMicrotask(() => {
          this.#retryWireTableQueued = false;
          if (!this.isConnected) return;
          this.#wireTable();
        });
      }
      return;
    }
    this.#tableWired = true;

    // `setData` no-op si #config aún no existe; `items` fuerza ensureConfig().
    tbl.items = [];

    const onAction = (ev: Event): void => {
      const e = ev as CustomEvent<{ actionId?: string; rowId?: string; row?: Alumno }>;
      const row = e.detail?.row;
      const actionId = e.detail?.actionId ?? "";
      if (actionId === "edit" && row) {
        this.#fillForm(row);
        return;
      }
      if (actionId === "delete") {
        const id = (e.detail?.rowId ?? row?.id ?? "").trim();
        if (!id) return;
        const runtime = this.runtime;
        if (!runtime) return;
        void runtime.dispatch(intentOf(AlumnosEcosystem.intentDelete, { id }), { source: "app-alumnos" });
        if (this.#editingId === id) this.#clearForm();
      }
    };
    tbl.addEventListener("action", onAction);
    this.onDestroy(() => tbl.removeEventListener("action", onAction));
  }

  #wireForm(): void {
    if (this.#formWired) return;
    AbeyFormElement.define("abey-form");
    const form = (this.querySelector('abey-form[data-role="alumnos-form"]') as AbeyFormElement | null) ?? null;
    this.#form = form;
    if (!form) return;
    this.#formWired = true;

    const cfg = classToAbeyFormConfig(AlumnoEntity as any);
    cfg.mode = "create";
    cfg.resetButtonLabel = "Limpiar";
    cfg.resolveSelectOptions = async (opts: FieldSelectOptions) => {
      const runtime = this.runtime;
      const channel = (this as any).channel?.() as any;
      if (!runtime || !channel?.on) return [];

      // En este ejemplo, solo Deezer genres. Se puede generalizar por `endpoint`.
      if (String(opts?.endpoint ?? "") !== "/genre") return [];

      const requestId = createReqId();
      const p = new Promise<Array<{ value: string; label: string }>>((resolve) => {
        let done = false;
        const off = channel.on(AlumnosEcosystem.eventGenres, (payload: any) => {
          if (done) return;
          if (String(payload?.requestId ?? "") !== requestId) return;
          done = true;
          off();
          resolve(Array.isArray(payload?.items) ? payload.items : []);
        });
        window.setTimeout(() => {
          if (done) return;
          done = true;
          off();
          resolve([]);
        }, 5000);
      });

      void runtime.dispatch(
        intentOf(AlumnosEcosystem.intentLoadGenres, { requestId, select: opts }),
        { source: "abey-form/select" },
      );
      return await p;
    };
    form.config = cfg;
    form.setStoreValue("id", "");
    form.formSlice = sliceFor(clearedValues(), "create");

    const onInvalid = (ev: Event): void => {
      const target = ev.target;
      if (target !== form) return;
      (this.state.banner as any) = { text: "Revisá los campos.", tone: "err" };
    };
    this.addEventListener("abeyforminvalid", onInvalid as EventListener);
    this.onDestroy(() => this.removeEventListener("abeyforminvalid", onInvalid as EventListener));

    const onSubmit = (ev: Event): void => {
      const target = ev.target;
      if (target !== form) return;
      const e = ev as CustomEvent<{ values?: Record<string, unknown> }>;
      const values = { ...(e.detail?.values ?? {}) } as any;
      const id = String(values.id ?? "").trim();

      const email = String(values.email ?? "").trim().toLowerCase();
      if (email) {
        const dup = this.#alumnos.some((a) => a.email.toLowerCase() === email && a.id !== id);
        if (dup) {
          form.formSlice = { ...form.formSlice, status: "error", fieldErrors: { email: "Este email ya existe." } };
          return;
        }
      }

      const draft = normalizeAlumno({ ...values, id: id || undefined } as any);
      const invalid = validateAlumno(draft);
      if (invalid) {
        form.formSlice = { ...form.formSlice, status: "error", fieldErrors: invalid.fieldErrors as any };
        (this.state.banner as any) = { text: invalid.message, tone: "err" };
        return;
      }

      const runtime = this.runtime;
      if (!runtime) {
        (this.state.banner as any) = { text: "Runtime aún no listo. Probá de nuevo.", tone: "err" };
        return;
      }
      const intent = id ? AlumnosEcosystem.intentUpdate : AlumnosEcosystem.intentCreate;
      void runtime.dispatch(intentOf(intent, draft), { source: "app-alumnos" });
    };
    // Escuchar en el host (bubbles: true) evita fallas si el nodo se rehidrata/cambia.
    this.addEventListener("abeyformsubmit", onSubmit as EventListener);
    this.onDestroy(() => this.removeEventListener("abeyformsubmit", onSubmit as EventListener));
  }

  #initData(): void {
    const runtime = this.runtime;
    if (!runtime) return;
    void runtime.dispatch(intentOf(AlumnosEcosystem.intentInit, {}), { source: "app-alumnos" });
  }

  #wireChannel(): void {
    const channel = (this as any).channel?.() as any;
    if (!channel?.on) return;

    this.onDestroy(
      channel.on(AlumnosEcosystem.eventChanged, (data: { alumnos?: Alumno[]; lastChangeAt?: number }) => {
        const alumnos = Array.isArray(data?.alumnos) ? data.alumnos : [];
        const lastChangeAt = typeof data?.lastChangeAt === "number" ? data.lastChangeAt : 0;
        this.#alumnos = alumnos;
        if (!this.#table) this.#wireTable();
        if (this.#table) this.#table.items = alumnos;
        (this.state.stats as any) = {
          count: alumnos.length,
          lastChangeAt,
          lastChangeLabel: formatWhen(lastChangeAt),
        };
        (this.state.banner as any) = { text: "Actualizado.", tone: "ok" };

        // reset UI to create mode after any successful change
        this.#editingId = "";
        (this.state.editingId as any) = "";
        if (this.#form) {
          this.#form.setStoreValue("id", "");
          this.#form.formSlice = sliceFor(clearedValues(), "create");
        }
      }),
    );

    this.onDestroy(
      channel.on(AlumnosEcosystem.eventInvalid, (payload: unknown) => {
        const p = payload as unknown as AlumnosInvalidPayload;
        const fieldErrors = (p?.fieldErrors ?? {}) as any;
        (this.state.banner as any) = { text: String(p?.message ?? "Error de validación"), tone: "err" };
        if (this.#form) {
          this.#form.formSlice = { ...this.#form.formSlice, status: "error", fieldErrors };
        }
      }),
    );
  }

  #onRootClick(ev: MouseEvent): void {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest<HTMLElement>("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action") ?? "";
    if (action === "clear-form") {
      this.#clearForm();
      return;
    }
  }

  #fillForm(a: Alumno): void {
    this.#editingId = a.id;
    (this.state.editingId as any) = a.id;
    (this.state.banner as any) = { text: "", tone: "idle" };
    if (this.#form) {
      this.#form.setStoreValue("id", a.id);
      this.#form.formSlice = sliceFor(
        { nombres: a.nombres, email: a.email, edad: a.edad, grado: a.grado, artistaFavoritoId: (a as any).artistaFavoritoId ?? "" },
        "edit",
      );
    }
  }

  #clearForm(): void {
    this.#editingId = "";
    (this.state.editingId as any) = "";
    (this.state.banner as any) = { text: "", tone: "idle" };
    if (this.#form) {
      this.#form.setStoreValue("id", "");
      this.#form.formSlice = sliceFor(clearedValues(), "create");
    }
  }
}
