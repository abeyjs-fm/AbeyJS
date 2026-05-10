import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.table-flows.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.table-flows.view.css?inline";

@AbeyComponent({
  selector: "app-doc-table-flows",
  route: "table-flows",
  parent: "/guides",
  label: "Table Flows",
  navIconFa: "fa-solid fa-diagram-next",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocTableFlowsElement extends AbeyComponentElement {}
