import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.crud-auto.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.crud-auto.view.css?inline";

@AbeyComponent({
  selector: "app-doc-crud-auto",
  route: "crud-auto",
  parent: "/guides",
  label: "Crud Auto",
  navIconFa: "fa-solid fa-magic-wand-sparkles",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocCrudAutoElement extends AbeyComponentElement {}
