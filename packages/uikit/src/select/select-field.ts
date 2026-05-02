import type { FieldSelectOptions, ViewField } from "../form/form-types.js";
import type { OmegaFormFieldUi } from "../form-field-ui-types.js";
import { ABEY, ABEY_TAG } from "../abey-form-classes.js";
import { ensureAbeySelectElementDefined, type AbeySelectElement } from "./abey-select-element.js";

/**
 * Combo tipo select (hidden + input de búsqueda + menú). Requiere registrar el handle en `fieldByName`
 * antes de que el usuario interactúe (igual que `createOmegaFormSurface`).
 */
export function mountSelectField(params: {
  f: ViewField;
  lab: HTMLLabelElement;
  draft: Map<string, string>;
  fieldByName: Map<string, OmegaFormFieldUi>;
  /** Clave en `draft` / `fieldByName` y `name` del hidden (p. ej. pestaña anidada). */
  bindingKey?: string;
  normalizeSelectItems: (
    items: Array<{ value: string; label: string }>,
    allowEmptyValue?: boolean,
  ) => Array<{ value: string; label: string }>;
  resolveSelectOptions?: (opts: FieldSelectOptions) => Promise<Array<{ value: string; label: string }>>;
}): {
  input: HTMLInputElement;
  hidden: HTMLInputElement;
  menu: HTMLDivElement;
  dispose: () => void;
  clearButton: HTMLButtonElement;
  syncClearVisibility: () => void;
} {
  const { f, lab, draft, fieldByName, normalizeSelectItems, resolveSelectOptions } = params;
  const bindingKey = params.bindingKey ?? f.name;
  ensureAbeySelectElementDefined();
  const wrap = document.createElement(ABEY_TAG.select) as AbeySelectElement;
  wrap.className = ABEY.selectCombo;
  wrap.style.position = "relative";

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = bindingKey;
  hidden.className = ABEY.selectValue;
  wrap.appendChild(hidden);

  const row = document.createElement("div");
  row.className = ABEY.selectComboRow;

  const input = document.createElement("input");
  input.type = "text";
  input.className = ABEY.input;
  input.placeholder = "Seleccione o escriba para buscar...";
  input.autocomplete = "off";
  input.name = "";
  row.appendChild(input);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = ABEY.selectClearBtn;
  clearBtn.textContent = "×";
  clearBtn.setAttribute("aria-label", "Limpiar selección");
  clearBtn.title = "Limpiar";
  clearBtn.hidden = true;
  row.appendChild(clearBtn);

  wrap.appendChild(row);

  const menu = document.createElement("div");
  menu.className = ABEY.selectMenu;
  menu.style.position = "absolute";
  menu.style.top = "calc(100% + 4px)";
  menu.style.left = "0";
  menu.style.right = "0";
  menu.style.zIndex = "20";
  menu.style.maxHeight = "220px";
  menu.style.overflowY = "auto";
  menu.style.border = "1px solid var(--abey-border)";
  menu.style.borderRadius = "8px";
  menu.style.background = "var(--abey-surface, #fff)";
  menu.style.display = "none";
  wrap.appendChild(menu);

  lab.appendChild(wrap);

  const openMenu = (): void => {
    menu.style.display = "";
  };
  const closeMenu = (): void => {
    menu.style.display = "none";
  };

  let blurCloseTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const cancelBlurClose = (): void => {
    if (blurCloseTimer != null) {
      clearTimeout(blurCloseTimer);
      blurCloseTimer = null;
    }
  };

  const currentValue = (): string => {
    return draft.get(bindingKey) ?? hidden.value ?? "";
  };

  const itemsAllowEmpty = (): boolean => {
    return !!f.optional || (fieldByName.get(bindingKey)?.selectItems ?? []).some((it) => it.value === "");
  };

  const syncClearVisibility = (): void => {
    if (!itemsAllowEmpty() || input.readOnly || input.disabled) {
      clearBtn.hidden = true;
      clearBtn.disabled = true;
      return;
    }
    const has = currentValue() !== "" || input.value.trim() !== "";
    clearBtn.hidden = !has;
    clearBtn.disabled = !has;
  };

  /**
   * `preserveInputText`: al borrar a mano, no tocar el texto visible aún.
   * Valor `""`: el input queda vacío (sin fila en menú si no hay ítem con `value: ""`).
   */
  const setSelected = (value: string, preserveInputText?: boolean): void => {
    const items = fieldByName.get(bindingKey)?.selectItems ?? [];
    const selected = items.find((it) => it.value === value);
    draft.set(bindingKey, value);
    hidden.value = value;
    if (preserveInputText) {
      syncClearVisibility();
      return;
    }
    if (value === "") {
      input.value = "";
      syncClearVisibility();
      return;
    }
    if (selected) {
      input.value = selected.label;
    } else {
      input.value = "";
    }
    syncClearVisibility();
  };

  const onClearClick = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!itemsAllowEmpty() || input.readOnly || input.disabled) return;
    setSelected("", false);
    const ui = fieldByName.get(bindingKey);
    if (ui) ui.selectActiveIndex = -1;
    closeMenu();
    input.focus();
  };
  clearBtn.addEventListener("click", onClearClick);

  const renderMenu = (): void => {
    const ui = fieldByName.get(bindingKey);
    if (!ui || !ui.menu) return;
    const items = ui.selectItems ?? [];
    const q = input.value.trim().toLowerCase();
    const filtered = q === "" ? items : items.filter((it) => it.label.toLowerCase().includes(q));
    ui.menu.textContent = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = ABEY.selectOption;
      empty.textContent = "Sin coincidencias";
      empty.style.padding = "8px 10px";
      empty.style.color = "var(--abey-text-muted)";
      ui.menu.appendChild(empty);
      openMenu();
      ui.selectActiveIndex = -1;
      return;
    }
    let active = ui.selectActiveIndex ?? -1;
    active = Math.min(Math.max(active, -1), filtered.length - 1);
    ui.selectActiveIndex = active;
    filtered.forEach((it, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = ABEY.selectOption;
      b.textContent = it.label;
      b.tabIndex = -1;
      b.style.display = "block";
      b.style.width = "100%";
      b.style.textAlign = "left";
      b.style.padding = "8px 10px";
      b.style.border = "0";
      b.style.background = idx === active ? "var(--abey-surface-elev)" : "transparent";
      b.addEventListener("mousedown", (e) => {
        e.preventDefault();
        setSelected(it.value);
        closeMenu();
        input.focus();
      });
      ui.menu!.appendChild(b);
    });
    openMenu();
  };

  const applyLabelForHiddenValue = (): void => {
    const ui = fieldByName.get(bindingKey);
    if (!ui) return;
    const v = currentValue();
    if (v === "") {
      if (input.value !== "") input.value = "";
      syncClearVisibility();
      return;
    }
    const selected = (ui.selectItems ?? []).find((it) => it.value === v);
    const nextLabel = selected?.label ?? "";
    if (input.value !== nextLabel) {
      input.value = nextLabel;
    }
    syncClearVisibility();
  };

  const syncLabelFromValue = (): void => {
    if (document.activeElement === input) {
      return;
    }
    applyLabelForHiddenValue();
  };

  /** Si el texto libre no coincide con ninguna etiqueta, al salir se corrige o se limpia el valor. */
  const reconcileInputOnClose = (): void => {
    const ui = fieldByName.get(bindingKey);
    if (!ui || input.readOnly) return;
    const items = ui.selectItems ?? [];
    const t = input.value.trim();
    if (t === "") {
      if (itemsAllowEmpty()) {
        setSelected("");
      } else {
        applyLabelForHiddenValue();
      }
      return;
    }
    const byLabel = items.find((it) => it.label.trim() === t);
    if (byLabel) {
      setSelected(byLabel.value);
      return;
    }
    applyLabelForHiddenValue();
  };

  const hasStaticItems = Array.isArray(f.selectStaticItems) && f.selectStaticItems.length > 0;
  const canResolveApiOptions = !hasStaticItems && !!f.selectOptions && typeof resolveSelectOptions === "function";

  // Lazy-load API options: runtime/channel may not be ready during initial mount.
  let loading = false;
  const ensureOptionsLoaded = (): void => {
    if (!canResolveApiOptions) return;
    const ui = fieldByName.get(bindingKey);
    if (!ui) return;
    if (loading) return;
    if (Array.isArray(ui.selectItems) && ui.selectItems.length > 0) return;
    loading = true;
    input.value = "Cargando...";
    input.readOnly = true;
    void resolveSelectOptions!(f.selectOptions as FieldSelectOptions)
      .then((items) => {
        const ui2 = fieldByName.get(bindingKey);
        if (!ui2) return;
        ui2.selectItems = normalizeSelectItems(items, f.optional);
      })
      .catch(() => {
        // keep empty
      })
      .finally(() => {
        loading = false;
        input.readOnly = false;
        syncLabelFromValue();
        syncClearVisibility();
        renderMenu();
      });
  };

  const onFocus = (): void => {
    cancelBlurClose();
    ensureOptionsLoaded();
    const ui = fieldByName.get(bindingKey);
    if (ui) ui.selectActiveIndex = -1;
    renderMenu();
    syncClearVisibility();
  };
  const onClick = (): void => {
    ensureOptionsLoaded();
    renderMenu();
  };
  const onInput = (): void => {
    if (!input.readOnly && input.value.trim() === "" && itemsAllowEmpty()) {
      if (hidden.value !== "" || currentValue() !== "") {
        setSelected("", true);
        const ui = fieldByName.get(bindingKey);
        if (ui) ui.selectActiveIndex = -1;
      }
    }
    renderMenu();
    syncClearVisibility();
  };

  /** Cierre diferido solo cuando el foco sale del combo (no al pasar del input a una opción del menú). */
  const scheduleCloseAndReconcile = (): void => {
    cancelBlurClose();
    blurCloseTimer = globalThis.setTimeout(() => {
      blurCloseTimer = null;
      reconcileInputOnClose();
      closeMenu();
    }, 50);
  };

  const onWrapFocusOut = (ev: FocusEvent): void => {
    const rt = ev.relatedTarget as Node | null;
    if (rt != null && wrap.contains(rt)) {
      return;
    }
    scheduleCloseAndReconcile();
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    const ui = fieldByName.get(bindingKey);
    if (!ui) return;
    const items = ui.selectItems ?? [];
    const q = input.value.trim().toLowerCase();
    const filtered = q === "" ? items : items.filter((it) => it.label.toLowerCase().includes(q));
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      reconcileInputOnClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length === 0) return;
      ui.selectActiveIndex = Math.min((ui.selectActiveIndex ?? -1) + 1, filtered.length - 1);
      renderMenu();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      ui.selectActiveIndex = Math.max((ui.selectActiveIndex ?? -1) - 1, 0);
      renderMenu();
      return;
    }
    if (e.key === "Enter") {
      const idx = ui.selectActiveIndex ?? -1;
      if (idx >= 0 && idx < filtered.length) {
        e.preventDefault();
        setSelected(filtered[idx]!.value);
        closeMenu();
        syncLabelFromValue();
      }
    }
  };

  input.addEventListener("focus", onFocus);
  input.addEventListener("click", onClick);
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);
  wrap.addEventListener("focusout", onWrapFocusOut);

  const onMenuMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
  };
  menu.addEventListener("mousedown", onMenuMouseDown);

  const dispose = (): void => {
    cancelBlurClose();
    clearBtn.removeEventListener("click", onClearClick);
    input.removeEventListener("focus", onFocus);
    input.removeEventListener("click", onClick);
    input.removeEventListener("input", onInput);
    input.removeEventListener("keydown", onKeyDown);
    wrap.removeEventListener("focusout", onWrapFocusOut);
    menu.removeEventListener("mousedown", onMenuMouseDown);
  };

  syncClearVisibility();

  return { input, hidden, menu, dispose, clearButton: clearBtn, syncClearVisibility };
}
