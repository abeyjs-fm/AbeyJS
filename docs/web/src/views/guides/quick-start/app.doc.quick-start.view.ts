import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.quick-start.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.quick-start.view.css?inline";

@AbeyComponent({
  selector: "app-doc-quick-start",
  route: "quick-start",
  parent: "/guides",
  order: 2,
  label: "Quick start",
  navIconFa: "fa-solid fa-rocket",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocQuickStartElement extends AbeyComponentElement {}
