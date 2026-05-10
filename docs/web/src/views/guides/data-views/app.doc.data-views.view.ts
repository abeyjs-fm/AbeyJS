import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.data-views.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.data-views.view.css?inline";

@AbeyComponent({
  selector: "app-doc-data-views",
  route: "data-views",
  parent: "/guides",
  label: "Data Views",
  navIconFa: "fa-solid fa-database",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocDataViewsElement extends AbeyComponentElement {}
