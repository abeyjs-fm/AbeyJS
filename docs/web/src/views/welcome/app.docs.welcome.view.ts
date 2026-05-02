import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { attachDocSiteSearch } from "../../doc-search-attach.js";
import { template } from "./app.docs.welcome.view.html";
import welcomeCss from "./app.docs.welcome.view.css?inline";

@AbeyComponent({
  selector: "app-docs-welcome",
  template,
  stylesText: [welcomeCss],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocsWelcomeElement extends AbeyComponentElement {
  #disposeSearch: (() => void) | undefined;

  connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected || !this.shadowRoot) return;
      const mount = this.shadowRoot.querySelector<HTMLElement>("[data-doc-find-mount]");
      if (!mount) return;
      this.#disposeSearch?.();
      this.#disposeSearch = attachDocSiteSearch(mount, (path) => {
        window.location.assign(path);
      });
    });
  }

  disconnectedCallback(): void {
    try {
      this.#disposeSearch?.();
      this.#disposeSearch = undefined;
    } finally {
      super.disconnectedCallback();
    }
  }
}
