import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.security.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.security.view.css?inline";

@AbeyComponent({
  selector: "app-doc-security",
  route: "security",
  parent: "/guides",
  label: "Security",
  navIconFa: "fa-solid fa-shield-halved",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocSecurityElement extends AbeyComponentElement {}
