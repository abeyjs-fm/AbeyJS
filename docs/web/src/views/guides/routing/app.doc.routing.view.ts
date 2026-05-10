import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.routing.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.routing.view.css?inline";

@AbeyComponent({
  selector: "app-doc-routing",
  route: "routing",
  parent: "/guides",
  label: "Routing",
  navIconFa: "fa-solid fa-route",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocRoutingElement extends AbeyComponentElement {}
