import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.vision.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.vision.view.css?inline";

@AbeyComponent({
  selector: "app-doc-vision",
  route: "vision",
  parent: "/guides",
  label: "Vision",
  navIconFa: "fa-solid fa-eye",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocVisionElement extends AbeyComponentElement {}
