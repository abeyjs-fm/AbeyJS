import { intentOf } from "@abeyjs/core";
import {
  DOM_CHANNEL_FACTORY,
  DOM_CHANNEL_TOKEN,
  AbeyComponent,
  AbeyComponentElement,
} from "@abeyjs/view";
import { entityToFormValues } from "@abeyjs/view/form/entity-form-values";
import { template } from "./app-students.view.html";
import StudentsCssUrl from "./app-students.view.css?inline";
import abeyTableKitCss from "@abeyjs/uikit/styles/abey-table.css?inline";
import { StudentsEcosystem } from "../omega/semantics.js";
import type {
  Student,
} from "../model/students.types.js";
import {
  StudentEntity,
  normalizeStudent,
  validateStudent,
} from "../model/students.types.js";
import {
  classToAbeyFormConfig,
  useChannel,
  createRemoteSelectResolver,
  wireCrudBridge,
} from "@abeyjs/uikit";
import { AbeyDialogElement } from "@abeyjs/uikit/dialog/abey-dialog";
import type { TableChannel, FormSlice, FormChannel } from "@abeyjs/uikit";
import omegaThemeCss from "@abeyjs/view/theme/omega-default.css?inline";
import omegaFormCss from "@abeyjs/view/theme/form/omega-form.css?inline";

interface AppStudentsState {
  banner: { text: string; tone: "idle" | "ok" | "err" };
  editingId: string;
  stats: { count: number; lastChangeAt: number; lastChangeLabel: string };
}

function formatWhen(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

/** Construye el estado base del form para create/edit. */
function sliceFor(
  values: Record<string, unknown>,
  mode: FormSlice["mode"],
): FormSlice {
  return { value: values, status: "idle", mode };
}

/** Valores iniciales del formulario (single source of truth para reset/fallbacks). */
function clearedValues(): Record<string, unknown> {
  return {
    nombres: "",
    email: "",
    edad: 0,
    grado: "",
    artistaFavoritoId: "",
    generoId: "",
    turno: "",
    aceptaTerminos: false,
  };
}

@AbeyComponent({
  selector: "app-students",
  template,
  stylesText: [StudentsCssUrl, abeyTableKitCss, omegaThemeCss, omegaFormCss],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppStudentsElement extends AbeyComponentElement {
  #table = useChannel<TableChannel<Student>>(this, "students-table");
  #form = useChannel<FormChannel>(this, "students-form");
  #dialog = useChannel<AbeyDialogElement>(this, "students-dialog");
  #editingId = "";
  #students: Student[] = [];
  #onRootClickBound: ((ev: MouseEvent) => void) | null = null;
  #tableWired = false;
  #formWired = false;
  #bootRetries = 0;
  #bootTimer: number | null = null;
  #booted = false;
  #dialogOpen = false;

  constructor() {
    super();
    this.state = {
      banner: { text: "", tone: "idle" as "idle" | "ok" | "err" },
      editingId: "",
      stats: { count: 0, lastChangeAt: 0, lastChangeLabel: "" },
    };
  }

  /** Helper para obtener elementos por rol de forma limpia y tipada */
  #getByRole<T extends Element = HTMLElement>(
    role: string,
    fallbackSelector?: string,
  ): T | null {
    const el =
      this.elByRole?.(role) ??
      (fallbackSelector ? this.querySelector(fallbackSelector) : null);
    return (el as T | null) ?? null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#mount();
      this.#boot();
    });
  }

  /** Espera runtime/canal y recién ahí arranca wiring + carga inicial. */
  #boot(): void {
    if (this.#booted) return;
    const runtime = this.runtime;
    const channel = this.channel<any>();
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

  /** Monta wiring de tabla, form y acciones del contenedor. */
  #mount(): void {
    if (!customElements.get("abey-dialog")) {
      customElements.define(
        "abey-dialog",
        AbeyDialogElement as unknown as CustomElementConstructor,
      );
    }
    this.#wireTable();
    this.#wireForm();

    const root = this.#getByRole<HTMLElement>("students-root");
    if (root) {
      this.#onRootClickBound = (ev: MouseEvent) => this.#onRootClick(ev);
      root.addEventListener("click", this.#onRootClickBound);
      this.onDestroy(() => {
        if (this.#onRootClickBound)
          root.removeEventListener("click", this.#onRootClickBound);
      });
    }

    // Sync dialog open state
    const dialogEl = this.#getByRole<HTMLElement>("students-dialog");
    if (dialogEl) {
      const onOpenAttrChange = (mutations: MutationRecord[]) => {
        for (const m of mutations) {
          if (m.attributeName === "open") {
            this.#dialogOpen = dialogEl.hasAttribute("open");
          }
        }
      };
      const observer = new MutationObserver(onOpenAttrChange);
      observer.observe(dialogEl, { attributes: true, attributeFilter: ["open"] });
      this.onDestroy(() => observer.disconnect());
    }
  }

  #openFormDialog(title: string): void {
    if (!this.#dialog) return;
    const dialog = this.#dialog;
    dialog.setAttribute("header", title);
    dialog.showModal();
    this.#dialogOpen = true;
  }

  #closeFormDialog(): void {
    if (!this.#dialog) return;
    const dialog = this.#dialog;
    dialog.close();
    this.#dialogOpen = false;
  }

  /** Conecta la tabla y maneja acciones de fila (editar/eliminar). */
  #wireTable(): void {
    this.#table.items = [];

    this.#table.onDelete((row) => {
      if (!row.id) return;
      const runtime = this.runtime;
      if (!runtime) return;
      void runtime.dispatch(
        intentOf(StudentsEcosystem.intentDelete, { id: row.id }),
        {
          source: "app-students",
        },
      );
      if (this.#editingId === row.id) this.#clearForm();
    });

    this.#table.onEdit((row) => {
      this.#editingId = row.id;
      const s = this.state as unknown as AppStudentsState;
      s.editingId = row.id;
      s.banner = { text: "", tone: "idle" };
      this.#applyFormState(
        "edit",
        entityToFormValues(
          row as unknown as Record<string, unknown>,
          clearedValues(),
        ),
        row.id,
      );
      this.#openFormDialog("Edit Student");
    });
  }

  /** Conecta el formulario, validaciones, submit y resolver de selects remotos. */
  #wireForm(): void {
    if (this.#formWired) return;

    if (!this.#form) {
      queueMicrotask(() => {
        if (!this.isConnected || this.#formWired) return;
        this.#wireForm();
      });
      return;
    }

    this.#formWired = true;
    const cfg = classToAbeyFormConfig(StudentEntity as any);
    cfg.resolveSelectOptions = createRemoteSelectResolver({
      runtime: this.runtime,
      channel: this.channel(),
      intent: StudentsEcosystem.intentLoadGenres,
      event: StudentsEcosystem.eventGenres,
      source: "app-students",
    });
    this.#form.config = cfg;

    this.#applyFormState("create");

    this.#form.onInvalid(() => {
      (this.state as unknown as AppStudentsState).banner = {
        text: "Please check the fields.",
        tone: "err",
      };
    });

    this.#form.onSubmit((values: any) => {
      const id = String(values.id ?? "").trim();
      const email = String(values.email ?? "").trim().toLowerCase();
      
      if (email) {
        const dup = this.#students.some(
          (a) => a.email.toLowerCase() === email && a.id !== id,
        );
        if (dup) {
          this.#form.formSlice = {
            ...this.#form.formSlice,
            status: "error",
            fieldErrors: { email: "This email already exists." },
          };
          return;
        }
      }

      const draft = normalizeStudent({ ...values, id: id || undefined } as any);
      const invalid = validateStudent(draft);
      if (invalid) {
        this.#form.formSlice = {
          ...this.#form.formSlice,
          status: "error",
          fieldErrors: invalid.fieldErrors as any,
        };
        (this.state as unknown as AppStudentsState).banner = {
          text: invalid.message,
          tone: "err",
        };
        return;
      }

      const runtime = this.runtime;
      if (!runtime) {
        (this.state as unknown as AppStudentsState).banner = {
          text: "Runtime not ready. Please try again.",
          tone: "err",
        };
        return;
      }
      const intent = id
        ? StudentsEcosystem.intentUpdate
        : StudentsEcosystem.intentCreate;
      void runtime.dispatch(intentOf(intent, draft), {
        source: "app-students",
      });
      this.#closeFormDialog();
    });
  }

  /** Dispara carga inicial del listado de estudiantes. */
  #initData(): void {
    const runtime = this.runtime;
    if (!runtime) return;
    void runtime.dispatch(intentOf(StudentsEcosystem.intentInit, {}), {
      source: "app-students",
    });
  }

  /** Suscribe eventos del ecosistema y sincroniza estado de tabla/form/banner. */
  #wireChannel(): void {
    const channel = this.channel<any>();
    if (!channel?.on) return;

    wireCrudBridge({
      host: this,
      channel,
      table: this.#table,
      form: this.#form,
      events: {
        changed: StudentsEcosystem.eventChanged,
        invalid: StudentsEcosystem.eventInvalid,
      },
      itemsKey: "students",
      onChanged: (data) => {
        const students = Array.isArray(data?.students) ? data.students : [];
        const lastChangeAt =
          typeof data?.lastChangeAt === "number" ? data.lastChangeAt : 0;
        this.#students = students;

        const s = this.state as unknown as AppStudentsState;
        s.stats = {
          count: students.length,
          lastChangeAt,
          lastChangeLabel: formatWhen(lastChangeAt),
        };
      },
      updateBanner: (text, tone) => {
        (this.state as unknown as AppStudentsState).banner = { text, tone };
      },
    });
  }

  /** Maneja acciones de UI locales del contenedor (ej. limpiar formulario). */
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
    if (action === "open-create") {
      this.resetEditing();
      this.#openFormDialog("New Student");
      return;
    }
  }

  /** Vuelve a modo creación y limpia edición actual. */
  #clearForm(): void {
    this.resetEditing();
    (this.state as unknown as AppStudentsState).banner = {
      text: "",
      tone: "idle",
    };
  }

  public resetEditing(): void {
    this.#editingId = "";
    const s = this.state as unknown as AppStudentsState;
    s.editingId = "";
    this.#applyFormState("create");
    if (this.#dialogOpen) this.#closeFormDialog();
  }

  /** Helper central para aplicar estado del form (modo, valores e id). */
  #applyFormState(
    mode: FormSlice["mode"],
    values: Record<string, unknown> = clearedValues(),
    id = "",
  ): void {
    if (!this.#form) return;
    this.#form.setStoreValue("id", id);
    this.#form.formSlice = sliceFor(values, mode);
  }
}
