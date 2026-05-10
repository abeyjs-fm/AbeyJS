import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.intro.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.intro.view.css?inline";

@AbeyComponent({
  selector: "app-doc-intro",
  route: "intro",
  parent: "/guides",
  order: 1,
  label: "Introduction",
  navIconFa: "fa-solid fa-flag",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocIntroElement extends AbeyComponentElement {}
