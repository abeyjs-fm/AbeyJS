import { AbeyTableElement } from "./abey-table.js";

export function ensureAbeyTableElementDefined(tagName = "abey-table"): void {
  AbeyTableElement.define(tagName);
}