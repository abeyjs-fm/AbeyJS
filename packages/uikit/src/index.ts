/**
 * **`@abeyjs/uikit`** — AbeyJs **`abey-*`** controls, **`mountFormView`**, table, form draft/registry utilities.
 *
 * **`README.md`** summarizes **`package.json` `exports`**; **`docs/abey-table.md`** covers **`abey-table`**.
 */
export type { ButtonVariant, OmegaButtonOptions } from "./button/omega-button.js";
export { createOmegaButton } from "./button/omega-button.js";
export { AbeyButtonElement, type AbeyButtonVariant } from "./button/abey-button.js";

export { ABEY, ABEY_TAG } from "./abey-form-classes.js";
export type { OmegaFormFieldUi } from "./form-field-ui-types.js";
export {
  mountCheckboxField,
  mountOptionalFieldsToggle,
  AbeyCheckboxElement,
  ensureAbeyCheckboxElementDefined,
} from "./checkbox/index.js";
export { mountRadioField, AbeyRadioElement, ensureAbeyRadioElementDefined } from "./radio/index.js";
export { mountSelectField, AbeySelectElement, ensureAbeySelectElementDefined } from "./select/index.js";
export { mountTextInputField, AbeyInputElement, ensureAbeyInputElementDefined } from "./input/index.js";

export {
  AbeyTableElement,
  createAbeyTable,
  avatar,
  statusPill,
} from "./table/abey-table.js";

export { AbeyFormElement } from "./form/abey-form.js";
export { AbeyLineItemsElement, type AbeyLineItemsConfig } from "./form/abey-line-items.js";
export {
  classToAbeyFormConfig,
  classToSchema,
  Checkbox,
  Checked,
  Email,
  FormFieldKind,
  FormModel,
  Hidden,
  Label,
  Optional,
  parseClassJson,
  PrimaryKey,
  classPrimaryKey,
  SelectApi,
  SelectStatic,
  RadioStatic,
  Regex,
  Required,
} from "./form/class-form.js";
export type {
  ClassToAbeyFormConfigOptions,
  FormModelOptions,
  RadioStaticItem,
  SelectApiOptions,
  SelectStaticItem,
} from "./form/class-form.js";

export {
  mountFormView,
  createOmegaFormSurface,
  applyViewTheme,
} from "./form/mount-form.js";

export { mountIntentButton } from "./form/intent-button.js";

export type {
  FieldKind,
  FieldSelectOptions,
  FormObjectTab,
  FormSlice,
  FormViewDef,
  OpenApiCrudFieldUiOverride,
  OpenApiCrudFieldUiOverrides,
  ViewField,
  ViewTheme,
} from "./form/form-types.js";

export type {
  AbeyTableAction,
  AbeyTableCell,
  AbeyTableColumn,
  AbeyTableConfig,
  AbeyTableStatusTone,
  AbeyTableLoadNetworkDetail,
} from "./table/abey-table.types.js";

export type { AbeyFormConfig } from "./form/abey-form.types.js";

export { inferBasicFormSchema, zodForViewField } from "./form/infer-basic-form-schema.js";

export {
  mapJsonToFieldSelectItems,
  resolveFieldSelectOptionsFromFetch,
  type FieldSelectItem,
} from "./form/field-select-lookup.js";
export {
  mountLineItemsTable,
  type LineItemsColumnDef,
  type LineItemsColumnKind,
  type LineItemsColumnRule,
  type LineItemsTableController,
  type MountLineItemsTableOptions,
} from "./form/mount-line-items-table.js";
export {
  lineItemsColumnsFromGenerated,
  type GeneratedLineItemsColumn,
  createLineItemsEmptyRow,
  type LineItemsEmptyRowOptions,
  type LineItemsEmptyRowOverrides,
} from "./form/line-items-generated.js";
export { createLineItemsRowSchema, type LineItemsZodOptions } from "./form/line-items-zod.js";
export {
  moveAbeyFormActionsIntoTabShell,
  slotHostIntoAbeyFormTabPanel,
  restoreAbeyFormHostToPool,
  type SlotAbeyFormTabPanelOptions,
} from "./form/abey-form-tab-helpers.js";

export {
  FormStore,
  lens,
  bindTextInput,
  bindNumberInput,
  attachAsyncValidator,
} from "./form/reactive-draft.js";

export { wireNativeFormDraft, flushNativeDraftField } from "./form/wire-native-form-draft.js";

export type {
  Unsubscribe,
  AsyncValidatorHandle,
  AttachAsyncValidatorOpts,
  FieldErrors as ReactiveDraftFieldErrors,
  FieldFlags as ReactiveDraftFieldFlags,
  FormSnapshot as ReactiveDraftSnapshot,
  Lens as ReactiveDraftLens,
  BindOptions as ReactiveDraftBindOptions,
  AsyncValidator as ReactiveDraftAsyncValidator,
} from "./form/reactive-draft.js";

export type {
  NativeDraftFieldKind,
  NativeDraftFieldSpec,
  WireNativeFormDraftOptions,
  WiredNativeDraftHandle,
} from "./form/wire-native-form-draft.js";

export {
  setGlobalRegistry,
  getGlobalRegistry,
  setGlobalRegistryPath,
  getGlobalRegistryPath,
} from "./utils/global-registry.js";
