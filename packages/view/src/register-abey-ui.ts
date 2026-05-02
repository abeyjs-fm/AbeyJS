import {
  AbeyButtonElement,
  AbeyCheckboxElement,
  AbeyFormElement,
  AbeyInputElement,
  AbeyLineItemsElement,
  AbeyRadioElement,
  AbeySelectElement,
  AbeyTableElement,
} from "@abeyjs/uikit";
import { AbeyProvideElement } from "./di/dom-di.js";
import { AbeyWidgetElement } from "./dom/abey-widget.js";

/**
 * Defines **`abey-*`** primitives from **`@abeyjs/uikit`** plus **`abey-widget`**, **`abey-provide`** — call once (**`main.ts`**) before routes mount.
 */
export function registerAbeyJsUi(): void {
  AbeyButtonElement.define("abey-button");
  AbeyFormElement.define("abey-form");
  AbeyLineItemsElement.define("abey-line-items");
  AbeyWidgetElement.define("abey-widget");
  AbeyProvideElement.define("abey-provide");

  // Common field widgets
  AbeyInputElement.define("abey-input");
  AbeySelectElement.define("abey-select");
  AbeyCheckboxElement.define("abey-checkbox");
  AbeyRadioElement.define("abey-radio");

  // Table
  AbeyTableElement.define("abey-table");
}

