import {
  AbeyButtonElement,
  AbeyCheckboxElement,
  AbeyInputElement,
  AbeyLineItemsElement,
  AbeyRadioElement,
  AbeySelectElement,
  ensureAbeyFormElementDefined,
  ensureAbeyTableElementDefined,
} from "@abeyjs/uikit";
import { AbeyProvideElement } from "@abeyjs/runtime";
import { AbeyWidgetElement } from "./dom/abey-widget.js";

/**
 * Defines **`abey-*`** primitives from **`@abeyjs/uikit`** plus **`abey-widget`**, **`abey-provide`** — call once (**`main.ts`**) before routes mount.
 */
export function registerAbeyJsUi(): void {
  AbeyButtonElement.define("abey-button");
  AbeyLineItemsElement.define("abey-line-items");
  AbeyWidgetElement.define("abey-widget");
  AbeyProvideElement.define("abey-provide");

  // Common field widgets
  AbeyInputElement.define("abey-input");
  AbeySelectElement.define("abey-select");
  AbeyCheckboxElement.define("abey-checkbox");
  AbeyRadioElement.define("abey-radio");
  ensureAbeyTableElementDefined("abey-table");
  ensureAbeyFormElementDefined();
}

