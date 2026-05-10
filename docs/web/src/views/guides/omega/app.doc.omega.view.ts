import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.omega.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.omega.view.css?inline";

@AbeyComponent({
  selector: "app-doc-omega",
  route: "runtime",
  parent: "/guides",
  label: "Omega",
  navIconFa: "fa-solid fa-atom",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocOmegaElement extends AbeyComponentElement {}
