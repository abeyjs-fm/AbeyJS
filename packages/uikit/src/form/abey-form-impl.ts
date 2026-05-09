import { intentOf } from "@abeyjs/core";
import type { OmegaRuntime } from "@abeyjs/runtime";
import {
  fieldErrorsToDottedMap,
  fieldErrorsToMap,
  safeParseWithErrors,
} from "@abeyjs/validation";
import type { ZodType } from "zod";
import type {
  FormObjectTab,
  FormSlice,
  FormViewDef,
  ViewField,
  ViewTheme,
} from "./form-types.js";
import { createOmegaFormSurface } from "./mount-form.js";
import type { AbeyFormConfig } from "./abey-form.types.js";
import { slotHostIntoAbeyFormTabPanel } from "./abey-form-tab-helpers.js";
import { moveAbeyFormActionsIntoTabShell } from "./abey-form-tab-helpers.js";
import { inferBasicFormSchema } from "./infer-basic-form-schema.js";

type FormSurface = ReturnType<typeof createOmegaFormSurface>;

function themeClassTokens(theme: ViewTheme | undefined): string[] {
  return (theme?.className ?? "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clearedFieldsRecord(
  fields: ViewField[],
  iv: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const radioGroupsDone = new Set<string>();

  for (const f of fields) {
    const kind = f.kind ?? "text";
    if (kind === "radio") {
      const g = (f.radioGroup ?? f.name).trim() || f.name;
      if (!radioGroupsDone.has(g)) {
        radioGroupsDone.add(g);
        const prev = iv[g];
        out[g] = prev != null && String(prev) !== "" ? String(prev) : f.name;
      }
      continue;
    }
    if (kind === "checkbox") {
      out[f.name] = false;
      continue;
    }
    if (kind === "select") {
      if (f.optional) {
        delete out[f.name];
      } else {
        out[f.name] = "";
      }
      continue;
    }
    if (kind === "number") {
      out[f.name] = 0;
      continue;
    }
    if (kind === "file") {
      out[f.name] = null;
      continue;
    }
    out[f.name] = "";
  }
  return out;
}

function clearedFormValue(cfg: {
  fields: ViewField[];
  tabs?: FormObjectTab[];
  initialValue?: Record<string, unknown>;
}): Record<string, unknown> {
  const iv = cfg.initialValue ?? {};
  const out = clearedFieldsRecord(cfg.fields, iv);
  for (const tab of cfg.tabs ?? []) {
    const subIv = (iv[tab.storeKey] as Record<string, unknown>) ?? {};
    out[tab.storeKey] = clearedFieldsRecord(tab.fields, subIv);
  }
  return out;
}

function stubRuntime(): OmegaRuntime {
  return {} as OmegaRuntime;
}

export class AbeyFormElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      "intentsubmit",
      "runtimepath",
      "flow",
      "configpath",
      "extraspath",
      "actions",
    ];
  }

  #config: AbeyFormConfig | null = null;
  #effectiveSchema: ZodType<Record<string, unknown>> | undefined;
  #hostThemeClasses: string[] = [];
  #surface: FormSurface | null = null;
  #slice: FormSlice = { value: {}, status: "idle", mode: "create" };
  #runtimePath = "__abeyRuntime";
  #storeExtra: Record<string, unknown> = {};
  #autoslotObserver: MutationObserver | null = null;
  #rebuildQueued = false;

  #queueRebuild(): void {
    if (this.#rebuildQueued) return;
    this.#rebuildQueued = true;
    queueMicrotask(() => {
      this.#rebuildQueued = false;
      if (!this.isConnected) return;
      if (this.#config) this.#rebuild();
    });
  }

  getStoreValue(path?: string): unknown {
    const base = {
      ...(this.#slice.value ?? {}),
      ...(this.#storeExtra ?? {}),
    } as Record<string, unknown>;
    const p = (path ?? "").trim();
    if (!p) return base;
    return getByPath(base, p);
  }

  setStoreValue(path: string, value: unknown): void {
    const p = path.trim();
    if (!p) return;
    setByPath(this.#storeExtra, p, value);
    this.dispatchEvent(
      new CustomEvent("abeyformstorechange", {
        bubbles: true,
        composed: true,
        detail: { path: p, value },
      }),
    );
  }

  get config(): AbeyFormConfig | null {
    return this.#config;
  }

  set config(v: AbeyFormConfig | null) {
    this.#config = v;
    if (this.isConnected) this.#rebuild();
  }

  set formSlice(v: FormSlice) {
    this.#slice = { ...v };
    this.#surface?.update(this.#slice);
  }

  get formSlice(): FormSlice {
    return { ...this.#slice };
  }

  connectedCallback(): void {
    this.classList.add("abey", "abey-form");
    if (!this.#config) {
      const cfgPath = (this.getAttribute("configpath") ?? "").trim();
      if (cfgPath) {
        const cfg = resolveGlobalPath(cfgPath) as AbeyFormConfig | undefined;
        if (cfg) {
          this.#config = cfg;
        }
      }
    }
    if (this.#config) this.#queueRebuild();
  }

  disconnectedCallback(): void {
    this.#disposeSurface();
  }

  attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    if (this.isConnected) {
      const cfgPath = (this.getAttribute("configpath") ?? "").trim();
      if (cfgPath) {
        const cfg = resolveGlobalPath(cfgPath) as AbeyFormConfig | undefined;
        if (cfg) {
          this.#config = cfg;
        }
      }
      if (this.#config) this.#queueRebuild();
    }
  }

  #disposeSurface(): void {
    this.#effectiveSchema = undefined;
    this.#autoslotObserver?.disconnect();
    this.#autoslotObserver = null;
    for (const c of this.#hostThemeClasses) {
      this.classList.remove(c);
    }
    this.#hostThemeClasses = [];
    this.#surface?.dispose();
    const section = this.#surface?.section;
    this.#surface = null;
    if (section && section.parentElement === this) {
      section.remove();
    }
  }

  #dispatchFormIntent(intentName: string | undefined, payload: unknown): void {
    const name = intentName?.trim();
    if (!name) return;
    const rt = this.#getRuntime();
    if (!rt || typeof rt.dispatch !== "function") return;
    if (this.getAttribute("flow") === "false") return;
    void rt.dispatch(intentOf(name, payload), { source: "abey-form" });
  }

  #getRuntime(): OmegaRuntime | null {
    const path =
      (this.getAttribute("runtimepath") ?? this.#runtimePath).trim() ||
      "__abeyRuntime";
    const parts = path.split(".").filter(Boolean);
    let cur: unknown = globalThis as unknown;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return null;
      cur = (cur as Record<string, unknown>)[p];
    }
    return (cur ?? null) as OmegaRuntime | null;
  }

  /**
   * Rebuilds the form surface
   */
  #rebuild(): void {
    this.#disposeSurface();
    const cfg = this.#config;
    if (!cfg) return;
    this.#storeExtra = {};

    this.#effectiveSchema =
      cfg.schema ??
      (cfg.inferBasicSchema === false
        ? undefined
        : inferBasicFormSchema({ fields: cfg.fields, tabs: cfg.tabs }));

    const def: FormViewDef = {
      kind: "form",
      title: cfg.title,
      fields: cfg.fields,
      tabs: cfg.tabs,
      rootFieldsPageSize: cfg.rootFieldsPageSize,
      schema: this.#effectiveSchema,
      showOptionalFieldsToggle: cfg.showOptionalFieldsToggle,
      resetButtonLabel: cfg.resetButtonLabel,
    };

    const rt = this.#getRuntime();
    const surface = createOmegaFormSurface(def, {
      theme: cfg.theme,
      resolveSelectOptions: cfg.resolveSelectOptions,
      runtime: rt ?? stubRuntime(),
      onResetSlice: () => {
        const next: FormSlice = {
          value: clearedFormValue(cfg),
          status: "idle",
          mode: cfg.mode ?? "create",
          fieldErrors: undefined,
          errorMessage: undefined,
          includeOptionalFields:
            cfg.showOptionalFieldsToggle === true
              ? (cfg.includeOptionalFields ?? true)
              : undefined,
        };
        this.#slice = next;

        this.#storeExtra = {};
        const extrasPath = (this.getAttribute("extraspath") ?? "").trim();
        if (extrasPath) {
          const extras = resolveGlobalPath(extrasPath) as
            | Record<string, unknown>
            | undefined;
          if (extras && typeof extras === "object") {
            for (const [k, v] of Object.entries(extras)) {
              this.setStoreValue(k, v);
            }
          }
        }

        this.dispatchEvent(
          new CustomEvent("abeyformreset", {
            bubbles: true,
            composed: true,
            detail: { values: next.value },
          }),
        );
        this.#dispatchFormIntent(this.#config?.resetIntent, {
          values: next.value,
        });
        return next;
      },
    });

    this.appendChild(surface.section);

    const hostExtras = themeClassTokens(cfg.theme);
    for (const c of hostExtras) {
      this.classList.add(c);
    }
    this.#hostThemeClasses = hostExtras;

    this.#slice = {
      value: clearedFormValue(cfg),
      status: "idle",
      mode: cfg.mode ?? "create",
      includeOptionalFields:
        cfg.showOptionalFieldsToggle === true
          ? (cfg.includeOptionalFields ?? true)
          : undefined,
    };
    this.#surface = surface;
    surface.update(this.#slice);

    const extrasPath = (this.getAttribute("extraspath") ?? "").trim();
    if (extrasPath) {
      const extras = resolveGlobalPath(extrasPath) as
        | Record<string, unknown>
        | undefined;
      if (extras && typeof extras === "object") {
        for (const [k, v] of Object.entries(extras)) {
          this.setStoreValue(k, v);
        }
      }
    }

    this.#autoSlotDeclarativeChildren(cfg);
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#autoSlotDeclarativeChildren(cfg);
    });
    this.#autoslotObserver?.disconnect();
    this.#autoslotObserver = new MutationObserver(() => {
      this.#autoSlotDeclarativeChildren(cfg);
    });
    this.#autoslotObserver.observe(this, { childList: true });

    const actionsMode = (this.getAttribute("actions") ?? "").trim();
    if (actionsMode === "tabshell") {
      moveAbeyFormActionsIntoTabShell(this);
    }

    surface.onSubmit(() => {
      if (!this.#surface || !this.#config) return;

      const rec = {
        ...this.#surface.readFormData(this.#slice),
        ...(this.#storeExtra ?? {}),
      };

      this.#slice = {
        ...this.#slice,
        status: "idle",
        errorMessage: undefined,
        value: rec,
      };
      this.#surface.update(this.#slice);

      const schema = this.#effectiveSchema;
      if (schema) {
        const p = safeParseWithErrors(schema, rec);
        if (!p.success && "fields" in p) {
          const fe =
            (cfg.tabs?.length ?? 0) > 0
              ? fieldErrorsToDottedMap(p.fields)
              : fieldErrorsToMap(p.fields);
          this.#slice = {
            ...this.#slice,
            fieldErrors: fe,
            status: "error",
            value: rec,
          };
          this.#surface.update(this.#slice);
          this.dispatchEvent(
            new CustomEvent("abeyforminvalid", {
              bubbles: true,
              composed: true,
              detail: { fieldErrors: fe, record: rec },
            }),
          );
          this.#dispatchFormIntent(this.#config?.invalidIntent, {
            fieldErrors: fe,
            record: rec,
          });
          return;
        }
        const merged = {
          ...(p.data as Record<string, unknown>),
          ...(this.#storeExtra ?? {}),
        };
        this.#emitSuccess(merged);
        return;
      }
      this.#emitSuccess(rec);
    });
  }

  #autoSlotDeclarativeChildren(cfg: AbeyFormConfig): void {
    const kids = Array.from(this.children).filter(
      (el) => el !== this.#surface?.section,
    );
    for (const el of kids) {
      if (!(el instanceof HTMLElement)) continue;
      const tabAttr = (el.getAttribute("tab") ?? "").trim();
      if (!tabAttr) continue;

      const panelIndex = resolveTabIndex(cfg, tabAttr);
      if (panelIndex == null) continue;

      const panel = this.querySelectorAll(".abey-form__tabpanel")[panelIndex];
      if (panel && panel.contains(el)) continue;

      slotHostIntoAbeyFormTabPanel(this, el, panelIndex, {
        title: (el.getAttribute("tab-title") ?? "").trim() || undefined,
        titleClassName:
          (el.getAttribute("tab-title-class") ?? "").trim() || undefined,
      });
    }
  }

  #emitSuccess(values: Record<string, unknown>): void {
    if (!this.#surface || !this.#config) return;
    this.#slice = {
      ...this.#slice,
      fieldErrors: undefined,
      errorMessage: undefined,
      status: "success",
    };
    this.#surface.update(this.#slice);

    const intentName = (
      this.getAttribute("intentsubmit") ??
      this.#config.submitIntent ??
      ""
    ).trim();
    const rt = this.#getRuntime();
    const flowOff = this.getAttribute("flow") === "false";
    const key = this.#config.submitPayloadKey ?? "values";

    if (intentName && rt && typeof rt.dispatch === "function" && !flowOff) {
      void rt.dispatch(intentOf(intentName, { [key]: values }), {
        source: "abey-form",
      });
    }

    this.dispatchEvent(
      new CustomEvent("abeyformsubmit", {
        bubbles: true,
        composed: true,
        detail: { values, intent: intentName || undefined },
      }),
    );
  }

  static define(tagName = "abey-form"): void {
    if (!customElements.get(tagName)) {
      customElements.define(
        tagName,
        AbeyFormElement as CustomElementConstructor,
      );
    }
  }

  constructor() {
    super();
    this.#upgradeProperty("config");
    this.#upgradeProperty("formSlice");
  }

  #upgradeProperty(prop: string) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = (this as any)[prop];
      delete (this as any)[prop];
      (this as any)[prop] = value;
    }
  }
}

function resolveGlobalPath(pathRaw: string): unknown {
  const path = pathRaw.trim();
  if (!path) return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = globalThis as unknown;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function resolveTabIndex(cfg: AbeyFormConfig, tabAttr: string): number | null {
  if (/^\d+$/.test(tabAttr)) {
    const n = Number(tabAttr);
    return Number.isFinite(n) ? n : null;
  }
  const tabs = cfg.tabs ?? [];
  const idx = tabs.findIndex((t) => t.id === tabAttr);
  return idx >= 0 ? idx : null;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const k = parts[i];
    const next = cur[k];
    if (next == null || typeof next !== "object" || Array.isArray(next)) {
      cur[k] = {};
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}
