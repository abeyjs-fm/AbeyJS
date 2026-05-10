import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.abey-component.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.abey-component.view.css?inline";

@AbeyComponent({
  selector: "app-doc-abey-component",
  route: "abey-component",
  parent: "/guides",
  label: "Abey Component",
  navIconFa: "fa-solid fa-puzzle-piece",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocAbeyComponentElement extends AbeyComponentElement {}
