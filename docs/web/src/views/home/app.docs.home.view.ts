import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { rewriteDocsSiteAnchors } from "../../docs-site-url.js";
import { template } from "./app.docs.home.view.html";
import homeCss from "./app.docs.home.view.css?inline";

@AbeyComponent({
  selector: "app-docs-home",
  route: "/panel",
  label: "Documentation",
  navIconFa: "fa-solid fa-book-open",
  template,
  stylesText: [homeCss],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocsHomeElement extends AbeyComponentElement {
  connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (this.shadowRoot) rewriteDocsSiteAnchors(this.shadowRoot);
    });
  }
}
