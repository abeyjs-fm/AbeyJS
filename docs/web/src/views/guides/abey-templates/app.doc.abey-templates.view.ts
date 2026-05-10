import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.abey-templates.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.abey-templates.view.css?inline";

@AbeyComponent({
  selector: "app-doc-abey-templates",
  route: "abey-templates",
  parent: "/guides",
  label: "Abey Templates",
  navIconFa: "fa-solid fa-file-code",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocAbeyTemplatesElement extends AbeyComponentElement {}
