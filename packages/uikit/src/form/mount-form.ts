import {
  fieldErrorsToDottedMap,
  fieldErrorsToMap,
  safeParseWithErrors,
} from "@abeyjs/validation";
import type { Unsubscribe } from "@abeyjs/core";
import type { StateCell } from "@abeyjs/state";
import type { OmegaRuntime } from "@abeyjs/runtime";
import type {
  FormViewDef,
  FormSlice,
  FieldSelectOptions,
  ViewField,
  ViewTheme,
} from "./form-types.js";
import type { OmegaFormFieldUi } from "../form-field-ui-types.js";
import { applyViewTheme } from "./theme/apply-view-theme.js";
import { ABEY } from "../abey-form-classes.js";
import { mountSelectField } from "../select/select-field.js";
import { mountCheckboxField } from "../checkbox/checkbox-field.js";
import { mountOptionalFieldsToggle } from "../checkbox/optional-fields-toggle.js";
import { mountRadioField } from "../radio/radio-field.js";
import { mountTextInputField } from "../input/input-field.js";

/**
 * **`FormViewDef`** rendering: **`createOmegaFormSurface`** builds the DOM (**`mountFormView`** wires **`StateCell`** + validation + submit).
 * Radio paging groups consecutive **`radioGroup`** blocks so pagination does not split a single logical choice set.
 */

export { applyViewTheme } from "./theme/apply-view-theme.js";

const ABEY_FIELD_STORE_SEP = "@@";

function fieldBindingId(storeKey: string | null, logical: string): string {
  return storeKey ? `${storeKey}${ABEY_FIELD_STORE_SEP}${logical}` : logical;
}

function fieldDomRadioGroupId(
  storeKey: string | null,
  logicalGroup: string,
): string {
  return fieldBindingId(storeKey, logicalGroup);
}

function radioGroupKey(f: ViewField): string {
  return (f.radioGroup ?? f.name).trim() || f.name;
}

/**
 * Partition root **`ViewField`** list into paging units — each non-radio is alone; consecutive radios sharing **`radioGroup`** stay together.
 */
function rootFieldUnits(fields: ViewField[]): ViewField[][] {
  const units: ViewField[][] = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i]!;
    if (f.kind === "radio") {
      const g = radioGroupKey(f);
      const block: ViewField[] = [];
      while (i < fields.length) {
        const x = fields[i]!;
        if (x.kind !== "radio" || radioGroupKey(x) !== g) break;
        block.push(x);
        i++;
      }
      units.push(block);
      continue;
    }
    units.push([f]);
    i++;
  }
  return units;
}

/**
 * Approx **`pageSize`** fields per page without splitting radio groups (one page may exceed **`pageSize`** when a radio block is larger).
 */
function paginateRootFieldUnits(
  fields: ViewField[],
  pageSize: number,
): ViewField[][] {
  if (pageSize <= 0 || fields.length <= pageSize) {
    return [fields];
  }
  const units = rootFieldUnits(fields);
  const pages: ViewField[][] = [];
  let cur: ViewField[] = [];
  let count = 0;
  for (const u of units) {
    const n = u.length;
    if (cur.length === 0) {
      cur.push(...u);
      count = n;
      continue;
    }
    if (count + n <= pageSize) {
      cur.push(...u);
      count += n;
    } else {
      pages.push(cur);
      cur = [...u];
      count = n;
    }
  }
  if (cur.length) pages.push(cur);
  return pages;
}

/**
 * Si la última página tiene pocos campos, la fusiona con la anterior (hasta `pageSize + 2`
 * campos en total) para evitar una pantalla casi vacía.
 */
function mergeSparseTrailingRootPages(
  pages: ViewField[][],
  pageSize: number,
): ViewField[][] {
  if (pageSize <= 0 || pages.length < 2) {
    return pages;
  }
  const cap = pageSize + 2;
  const out = pages.map((p) => [...p]);
  while (out.length >= 2) {
    const prev = out[out.length - 2]!;
    const last = out[out.length - 1]!;
    if (last.length === 0) {
      out.pop();
      continue;
    }
    if (last.length <= 2 && prev.length + last.length <= cap) {
      out[out.length - 2] = [...prev, ...last];
      out.pop();
      continue;
    }
    break;
  }
  return out;
}

function nestRef(
  root: Record<string, unknown>,
  storeKey: string | null,
): Record<string, unknown> {
  if (!storeKey) {
    return root;
  }
  const raw = root[storeKey];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function dottedErrorKey(storeKey: string | null, logicalKey: string): string {
  return storeKey ? `${storeKey}.${logicalKey}` : logicalKey;
}

function toDateInputValue(raw: unknown): string {
  if (raw == null) {
    return "";
  }
  const text = String(raw).trim();
  if (text === "") {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  if (m?.[1]) {
    return m[1];
  }
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Mount **`def`** under **`root`**, subscribe to **`cell`**, **`validate`** on submit, **`onValid`** dispatch.
 * Cleanup: returned **`Unsubscribe`** tears down **`cell`** listener and **`ui.dispose()`**.
 */
export function mountFormView<TView>(
  root: HTMLElement,
  def: FormViewDef,
  cell: StateCell<Record<string, unknown>>,
  config: {
    getForm: (s: TView) => FormSlice;
    onValid: (v: Record<string, unknown>, runtime: OmegaRuntime) => void;
    onValidationFieldErrors?: (
      s: TView,
      fieldErrors: Record<string, string>,
    ) => void;
    resolveSelectOptions?: (
      opts: FieldSelectOptions,
    ) => Promise<Array<{ value: string; label: string }>>;
    runtime: OmegaRuntime;
    theme?: ViewTheme;
  },
): Unsubscribe {
  const ui = createOmegaFormSurface(def, config);
  root.replaceChildren(ui.section);

  let lastSlice: FormSlice | null = null;
  const render = (): void => {
    const vs = config.getForm(cell.get() as TView);
    lastSlice = vs;
    ui.update(vs);
  };

  ui.onSubmit(() => {
    const vs = lastSlice ?? config.getForm(cell.get() as TView);
    const record = ui.readFormData(vs);

    if (def.schema) {
      const p = safeParseWithErrors(def.schema, record);
      if (!p.success && "fields" in p) {
        const m =
          (def.tabs?.length ?? 0) > 0
            ? fieldErrorsToDottedMap(p.fields)
            : fieldErrorsToMap(p.fields);
        config.onValidationFieldErrors?.(cell.get() as TView, m);
        return;
      }
      config.onValid(p.data as Record<string, unknown>, config.runtime);
      return;
    }
    config.onValid(record, config.runtime);
  });

  render();
  const unsub = cell.subscribe(render);
  return (): void => {
    unsub();
    ui.dispose();
  };
}

/**
 * Stateless builder: **`section`** subtree + **`update(vs)`** to hydrate fields (**`FormSlice`**), **`readFormData`**, **`onSubmit`** hook.
 */
export function createOmegaFormSurface(
  def: FormViewDef,
  config: {
    resolveSelectOptions?: (
      opts: FieldSelectOptions,
    ) => Promise<Array<{ value: string; label: string }>>;
    runtime: OmegaRuntime;
    theme?: ViewTheme;
    /** Slice after reset (**`resetButtonLabel`**). */
    onResetSlice?: () => FormSlice;
  },
): {
  section: HTMLElement;
  update: (vs: FormSlice) => void;
  onSubmit: (fn: () => void) => void;
  readFormData: (vs: FormSlice) => Record<string, unknown>;
  dispose: () => void;
} {
  const section = document.createElement("section");
  applyViewTheme(section, config.theme, "abey-form");

  const h2 = document.createElement("h2");
  h2.className = "abey-form__title";
  section.appendChild(h2);

  const form = document.createElement("form");
  section.appendChild(form);

  const formMessage = document.createElement("p");
  formMessage.className = "abey-form__message";
  formMessage.setAttribute("role", "alert");
  formMessage.style.display = "none";
  form.appendChild(formMessage);

  const fieldUIs: OmegaFormFieldUi[] = [];
  const fieldByName = new Map<string, OmegaFormFieldUi>();

  const normalizeSelectItems = (
    items: Array<{ value: string; label: string }>,
    allowEmptyValue?: boolean,
  ) =>
    items
      .map((it) => ({
        value: String(it.value ?? "").trim(),
        label: String(it.label ?? "").trim(),
      }))
      .filter((it) => allowEmptyValue || it.value !== "");

  const draft = new Map<string, string>();
  let lastMode: FormSlice["mode"] | null = null;
  let lastStatus: FormSlice["status"] | null = null;
  let includeOptionalFields = true;
  let optionalToggleInput: HTMLInputElement | null = null;
  let optionalToggleDispose: (() => void) | undefined;

  const setControlValueIfSafe = (el: HTMLInputElement, next: string): void => {
    if (document.activeElement === el) {
      return;
    }
    if (el.value !== next) {
      el.value = next;
    }
  };

  const appendOneFieldRow = (
    rowParent: HTMLElement,
    f: ViewField,
    storeKey: string | null,
  ): void => {
    const lab = document.createElement("label");
    lab.className = ABEY.field;
    const labSpan = document.createElement("span");
    labSpan.className = ABEY.fieldLabel;
    labSpan.textContent = f.label;
    lab.appendChild(labSpan);
    if (f.optional) {
      lab.dataset.abeyOptional = "1";
    }

    const bindingId = fieldBindingId(storeKey, f.name);

    let input: HTMLInputElement;
    let hidden: HTMLInputElement | undefined;
    let menu: HTMLDivElement | undefined;
    let dispose: (() => void) | undefined;
    let selectClearButton: HTMLButtonElement | undefined = undefined;
    let syncSelectClearVisibility: (() => void) | undefined = undefined;

    if (f.kind === "select") {
      const built = mountSelectField({
        f,
        lab,
        draft,
        fieldByName,
        bindingKey: bindingId,
        normalizeSelectItems,
        resolveSelectOptions: config.resolveSelectOptions,
      });
      input = built.input;
      hidden = built.hidden;
      menu = built.menu;
      dispose = built.dispose;
      selectClearButton = built.clearButton;
      syncSelectClearVisibility = built.syncClearVisibility;
    } else if (f.kind === "checkbox") {
      const built = mountCheckboxField(lab, f.name, draft, { bindingId });
      input = built.input;
      dispose = built.dispose;
    } else if (f.kind === "radio") {
      const g = (f.radioGroup ?? f.name).trim() || f.name;
      const built = mountRadioField(lab, f, draft, {
        groupBindingId: fieldDomRadioGroupId(storeKey, g),
      });
      input = built.input;
      dispose = built.dispose;
    } else {
      const built = mountTextInputField(lab, f, draft, { bindingId });
      input = built.input;
      dispose = built.dispose;
    }

    const ui: OmegaFormFieldUi = {
      kind: f.kind,
      name: f.name,
      bindingId,
      valueStoreKey: storeKey,
      field: f,
      root: lab,
      input,
      hidden,
      menu,
      dispose,
      selectClearButton,
      syncSelectClearVisibility,
      radioGroup:
        f.kind === "radio"
          ? (f.radioGroup ?? f.name).trim() || f.name
          : undefined,
      optional: !!f.optional,
    };
    fieldUIs.push(ui);
    fieldByName.set(bindingId, ui);
    rowParent.appendChild(lab);

    if (
      f.kind === "select" &&
      Array.isArray(f.selectStaticItems) &&
      f.selectStaticItems.length > 0
    ) {
      const uiSel = fieldByName.get(bindingId);
      if (uiSel) {
        uiSel.selectItems = normalizeSelectItems(
          f.selectStaticItems,
          f.optional,
        );
        const inp = uiSel.input;
        const v = uiSel.hidden?.value ?? "";
        const selected = (uiSel.selectItems ?? []).find((it) => it.value === v);
        if (document.activeElement !== inp) {
          if (v === "") {
            inp.value = "";
          } else if (selected) {
            inp.value = selected.label;
          } else {
            inp.value = "";
          }
        }
        uiSel.syncSelectClearVisibility?.();
      }
    }
  };

  const appendFieldRows = (
    parent: HTMLElement,
    fields: ViewField[],
    storeKey: string | null,
  ): void => {
    let fi = 0;
    while (fi < fields.length) {
      const f = fields[fi]!;
      if (f.kind === "radio") {
        const g = radioGroupKey(f);
        const group: ViewField[] = [];
        while (fi < fields.length) {
          const x = fields[fi]!;
          if (x.kind !== "radio" || radioGroupKey(x) !== g) break;
          group.push(x);
          fi++;
        }
        const grpEl = document.createElement("div");
        grpEl.className = "abey-form__radio-group";
        grpEl.setAttribute("role", "radiogroup");
        grpEl.setAttribute("aria-label", g);
        for (const rf of group) {
          appendOneFieldRow(grpEl, rf, storeKey);
        }
        /** Campos no-radio consecutivos al grupo (p. ej. select + checkbox) van al costado en escritorio vía `.abey-form__field-split`. */
        const asideFields: ViewField[] = [];
        while (fi < fields.length && fields[fi]!.kind !== "radio") {
          asideFields.push(fields[fi]!);
          fi++;
        }
        if (asideFields.length > 0) {
          const split = document.createElement("div");
          split.className = "abey-form__field-split";
          split.appendChild(grpEl);
          const asideEl = document.createElement("div");
          asideEl.className = "abey-form__field-aside";
          for (const af of asideFields) {
            appendOneFieldRow(asideEl, af, storeKey);
          }
          split.appendChild(asideEl);
          parent.appendChild(split);
        } else {
          parent.appendChild(grpEl);
        }
        continue;
      }
      appendOneFieldRow(parent, f, storeKey);
      fi++;
    }
  };

  const tabs = def.tabs ?? [];
  const pageSize = def.rootFieldsPageSize ?? 0;
  const useStacked =
    tabs.length > 0 || (pageSize > 0 && def.fields.length > pageSize);

  if (useStacked) {
    section.classList.add("abey-form--stacked");
    const main = document.createElement("div");
    main.className = "abey-form__main";

    const rootWrap = document.createElement("div");
    rootWrap.className = "abey-form__root-wrap";

    if (pageSize > 0 && def.fields.length > pageSize) {
      const pager = document.createElement("div");
      pager.className = "abey-form__pager";
      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "abey-btn abey-btn--secondary abey-form__pager-btn";
      prev.textContent = "Anterior";
      const info = document.createElement("span");
      info.className = "abey-form__pager-info";
      const next = document.createElement("button");
      next.type = "button";
      next.className = "abey-btn abey-btn--secondary abey-form__pager-btn";
      next.textContent = "Siguiente";
      const pagesRoot = document.createElement("div");
      pagesRoot.className = "abey-form__pages";
      const pageSlices = mergeSparseTrailingRootPages(
        paginateRootFieldUnits(def.fields, pageSize),
        pageSize,
      );
      const pageCount = pageSlices.length;
      let rootPage = 0;
      const pageEls: HTMLElement[] = [];
      for (let p = 0; p < pageCount; p++) {
        const pageEl = document.createElement("div");
        pageEl.className = "abey-form__page abey-form__field-grid";
        pageEl.hidden = p !== 0;
        appendFieldRows(pageEl, pageSlices[p]!, null);
        pagesRoot.appendChild(pageEl);
        pageEls.push(pageEl);
      }
      const syncPager = (): void => {
        info.textContent = `Página ${rootPage + 1} / ${pageCount}`;
        prev.disabled = rootPage <= 0;
        next.disabled = rootPage >= pageCount - 1;
        for (let i = 0; i < pageEls.length; i++) {
          pageEls[i]!.hidden = i !== rootPage;
        }
      };
      prev.addEventListener("click", () => {
        if (rootPage > 0) {
          rootPage--;
          syncPager();
        }
      });
      next.addEventListener("click", () => {
        if (rootPage < pageCount - 1) {
          rootPage++;
          syncPager();
        }
      });
      pager.appendChild(prev);
      pager.appendChild(info);
      pager.appendChild(next);
      rootWrap.appendChild(pager);
      rootWrap.appendChild(pagesRoot);
      syncPager();
    } else {
      const grid = document.createElement("div");
      grid.className = "abey-form__field-grid";
      appendFieldRows(grid, def.fields, null);
      rootWrap.appendChild(grid);
    }

    main.appendChild(rootWrap);

    if (tabs.length > 0) {
      const tabShell = document.createElement("div");
      tabShell.className = "abey-form__tabs";
      const tablist = document.createElement("div");
      tablist.className = "abey-form__tablist";
      tablist.setAttribute("role", "tablist");
      const panels = document.createElement("div");
      panels.className = "abey-form__tabpanels";
      const tabBtns: HTMLButtonElement[] = [];
      const tabPanels: HTMLElement[] = [];
      let activeTab = 0;
      const setTab = (idx: number, doFocus = false): void => {
        activeTab = Math.max(0, Math.min(idx, tabBtns.length - 1));
        for (let i = 0; i < tabBtns.length; i++) {
          const on = i === activeTab;
          tabBtns[i]!.setAttribute("aria-selected", on ? "true" : "false");
          tabBtns[i]!.tabIndex = on ? 0 : -1;
          tabPanels[i]!.hidden = !on;
        }
        if (doFocus) tabBtns[activeTab]?.focus();
      };
      tabs.forEach((tab, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "abey-form__tab";
        btn.setAttribute("role", "tab");
        btn.id = `abey-tab-${tab.id}`.replace(/[^\w-]/g, "_");
        btn.textContent = tab.label;
        btn.addEventListener("click", () => setTab(idx, true));
        tablist.appendChild(btn);
        tabBtns.push(btn);

        const panel = document.createElement("div");
        panel.className = "abey-form__tabpanel abey-form__field-grid";
        panel.setAttribute("role", "tabpanel");
        panel.hidden = idx !== 0;
        appendFieldRows(panel, tab.fields, tab.storeKey);
        panels.appendChild(panel);
        tabPanels.push(panel);
      });
      setTab(0);
      tabShell.appendChild(tablist);
      tabShell.appendChild(panels);
      main.appendChild(tabShell);
    }

    form.appendChild(main);
  } else {
    appendFieldRows(form, def.fields, null);
  }

  const applyOptionalDisabled = (): void => {
    const on = includeOptionalFields;
    for (const ui of fieldUIs) {
      if (!ui.optional) continue;
      ui.input.disabled = !on;
      ui.root.style.opacity = on ? "" : "0.55";
      ui.syncSelectClearVisibility?.();
    }
  };

  if (def.showOptionalFieldsToggle) {
    const opt = mountOptionalFieldsToggle((inc) => {
      includeOptionalFields = inc;
      applyOptionalDisabled();
    });
    optionalToggleInput = opt.checkbox;
    optionalToggleDispose = opt.dispose;
    form.appendChild(opt.wrap);
    applyOptionalDisabled();
  }

  const actions = document.createElement("div");
  actions.className = "abey-form__actions";

  let resetBtn: HTMLButtonElement | null = null;
  const resetLabel = def.resetButtonLabel?.trim();
  if (resetLabel && typeof config.onResetSlice === "function") {
    resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "abey-btn abey-btn--secondary";
    resetBtn.textContent = resetLabel;
  }

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "abey-btn abey-btn--primary";
  if (resetBtn) {
    actions.appendChild(resetBtn);
  }
  actions.appendChild(submitBtn);
  form.appendChild(actions);

  let resetHandler: ((ev: Event) => void) | null = null;
  if (resetBtn && config.onResetSlice) {
    resetHandler = (ev: Event) => {
      ev.preventDefault();
      draft.clear();
      update(config.onResetSlice!());
    };
    resetBtn.addEventListener("click", resetHandler);
  }

  let submitHandler: ((ev: Event) => void) | null = null;
  const onSubmit = (fn: () => void): void => {
    if (submitHandler) form.removeEventListener("submit", submitHandler);
    submitHandler = (ev: Event) => {
      ev.preventDefault();
      fn();
    };
    form.addEventListener("submit", submitHandler);
  };

  const setFieldError = (
    ui: OmegaFormFieldUi,
    msg: string | undefined,
  ): void => {
    if (msg) {
      ui.input.setAttribute("aria-invalid", "true");
      if (!ui.error) {
        const err = document.createElement("span");
        err.className = "abey-field__error";
        err.setAttribute("role", "alert");
        ui.error = err;
        ui.root.appendChild(err);
      }
      ui.error.textContent = msg;
    } else {
      ui.input.removeAttribute("aria-invalid");
      ui.error?.remove();
      ui.error = undefined;
    }
  };

  const update = (vs: FormSlice): void => {
    if (lastMode !== null && lastMode !== vs.mode) {
      draft.clear();
    }
    if (vs.status === "success" && lastStatus !== "success") {
      draft.clear();
    }
    lastMode = vs.mode;
    lastStatus = vs.status;
    h2.textContent = vs.mode === "edit" ? `Editar — ${def.title}` : def.title;

    if (optionalToggleInput && typeof vs.includeOptionalFields === "boolean") {
      optionalToggleInput.checked = vs.includeOptionalFields;
      includeOptionalFields = vs.includeOptionalFields;
      applyOptionalDisabled();
    }

    if (vs.errorMessage) {
      formMessage.textContent = vs.errorMessage;
      formMessage.style.display = "";
    } else {
      formMessage.textContent = "";
      formMessage.style.display = "none";
    }

    for (const ui of fieldUIs) {
      const f = ui.field;
      const sk = ui.valueStoreKey;
      const nest = nestRef(vs.value, sk);
      const errKey = f.kind === "radio" && f.radioGroup ? f.radioGroup : f.name;
      const dotted = dottedErrorKey(sk, errKey);
      setFieldError(ui, vs.fieldErrors?.[dotted] ?? vs.fieldErrors?.[f.name]);

      const draftValue = draft.get(ui.bindingId);
      const rawVal = sk ? nest[f.name] : vs.value[f.name];
      const nextFromModel =
        f.kind === "date"
          ? toDateInputValue(rawVal)
          : rawVal == null
            ? ""
            : String(rawVal);

      if (f.kind === "select") {
        const nextValue = draftValue ?? nextFromModel;
        if (ui.hidden) {
          if (ui.hidden.value !== nextValue) {
            ui.hidden.value = nextValue;
          }
        }
        if (document.activeElement !== ui.input) {
          const items = ui.selectItems ?? [];
          if (nextValue === "") {
            ui.input.value = "";
          } else {
            const sel = items.find((it) => it.value === nextValue);
            ui.input.value = sel?.label ?? "";
          }
        }
        ui.syncSelectClearVisibility?.();
        continue;
      }
      if (f.kind === "checkbox") {
        const v = sk ? nest[f.name] : vs.value[f.name];
        const checked = v === true || v === "true" || v === 1 || v === "1";
        if (document.activeElement !== ui.input)
          (ui.input as HTMLInputElement).checked = checked;
        continue;
      }
      if (f.kind === "radio") {
        const g = ui.radioGroup ?? f.name;
        const selected = sk ? nest[g] : vs.value[g];
        const match = selected != null && String(selected) === f.name;
        if (document.activeElement !== ui.input)
          (ui.input as HTMLInputElement).checked = match;
        continue;
      }
      if (f.kind === "file") {
        continue;
      }
      const next = draftValue ?? nextFromModel;
      setControlValueIfSafe(ui.input, next);
    }

    submitBtn.textContent =
      vs.status === "saving" ? "…" : vs.mode === "edit" ? "Guardar" : "Enviar";
    submitBtn.disabled = vs.status === "saving";
    if (resetBtn) resetBtn.disabled = vs.status === "saving";
  };

  /**
   * Reads form data and returns a record.
   * @param vs Form slice
   * @returns Record with form data
   */
  const readFormData = (vs: FormSlice): Record<string, unknown> => {
    const data = new FormData(form);
    const record: Record<string, unknown> = { ...vs.value };
    const nestDraft = new Map<string, Record<string, unknown>>();
    const radioDomRead = new Set<string>();

    const ensureNest = (sk: string): Record<string, unknown> => {
      if (!nestDraft.has(sk)) {
        const prev = record[sk];
        const base =
          prev && typeof prev === "object" && !Array.isArray(prev)
            ? { ...(prev as Record<string, unknown>) }
            : {};
        nestDraft.set(sk, base);
      }
      return nestDraft.get(sk)!;
    };

    for (const ui of fieldUIs) {
      const f = ui.field;
      const sk = ui.valueStoreKey;
      const target = sk ? ensureNest(sk) : record;

      if (f.kind === "select") {
        const raw = ui.hidden?.value ?? "";
        if (f.optional && raw === "") {
          delete target[f.name];
        } else {
          target[f.name] = raw;
        }
        continue;
      }
      if (f.kind === "checkbox") {
        target[f.name] = !!(ui.input as HTMLInputElement).checked;
        continue;
      }
      if (f.kind === "radio") {
        const domName = ui.input.name;
        if (radioDomRead.has(domName)) continue;
        radioDomRead.add(domName);
        const g = (f.radioGroup ?? f.name).trim() || f.name;
        const checkedUi = fieldUIs.find(
          (u) =>
            u.input.name === domName && (u.input as HTMLInputElement).checked,
        );
        target[g] = checkedUi
          ? (checkedUi.input as HTMLInputElement).value
          : "";
        continue;
      }
      if (f.kind === "file") {
        target[f.name] = (ui.input as HTMLInputElement).files?.[0] ?? null;
        continue;
      }
      const v0 = data.get(ui.bindingId);
      if (f.kind === "number") {
        const n = v0 === null || v0 === "" ? 0 : Number(v0);
        target[f.name] = Number.isNaN(n) ? 0 : n;
      } else {
        target[f.name] = v0 == null ? "" : String(v0);
      }
    }

    for (const [sk, obj] of nestDraft) {
      record[sk] = obj;
    }

    if (!includeOptionalFields) {
      for (const ui of fieldUIs) {
        if (!ui.optional) continue;
        const f = ui.field;
        const sk = ui.valueStoreKey;
        if (sk) {
          const nest = record[sk];
          if (nest && typeof nest === "object" && !Array.isArray(nest)) {
            const o = nest as Record<string, unknown>;
            if (f.kind === "radio" && f.radioGroup) {
              const g = (f.radioGroup ?? f.name).trim() || f.name;
              delete o[g];
            } else {
              delete o[f.name];
            }
          }
        } else if (f.kind === "radio" && f.radioGroup) {
          const g = (f.radioGroup ?? f.name).trim() || f.name;
          delete record[g];
        } else {
          delete record[f.name];
        }
      }
    }
    return record;
  };

  return {
    section,
    update,
    onSubmit,
    readFormData,
    dispose: () => {
      if (resetBtn && resetHandler)
        resetBtn.removeEventListener("click", resetHandler);
      if (submitHandler) form.removeEventListener("submit", submitHandler);
      for (const ui of fieldUIs) ui.dispose?.();
      optionalToggleDispose?.();
      fieldByName.clear();
      draft.clear();
      lastMode = null;
      lastStatus = null;
    },
  };
}
