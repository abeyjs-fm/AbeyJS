/**
 * Custom element tag names (`<abey-…>`) — hyphenated **HTML** identifiers.
 */
export const ABEY_TAG = {
  checkbox: "abey-checkbox",
  radio: "abey-radio",
  /** Host wrapping native control with **`class="abey-input"`** — set **`type`** on host or via **`ViewField.kind`**. */
  input: "abey-input",
  select: "abey-select",
} as const;

/**
 * Shared **`abey-*` CSS classes** for form layouts and imperative mount helpers.
 */
export const ABEY = {
  field: "abey-field",
  fieldLabel: "abey-field__label",
  input: "abey-input",
  checkbox: "abey-checkbox",
  radio: "abey-radio",
  /** Class on **`abey-select`** host (element name already conveys **`abey-select`**). */
  selectCombo: "abey-field__combo",
  /** Flex row: search input + clear (×) control. */
  selectComboRow: "abey-select-comboRow",
  /** × button beside combo search input. */
  selectClearBtn: "abey-select-clear",
  selectValue: "abey-select-value",
  selectMenu: "abey-select-menu",
  selectOption: "abey-select-option",
} as const;
