import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.doc.bootstrap-shell.view.html";
import docMarkdownBase from "../shared/doc-guide.view.css?inline";
import viewStyles from "./app.doc.bootstrap-shell.view.css?inline";

@AbeyComponent({
  selector: "app-doc-bootstrap-shell",
  template,
  stylesText: [docMarkdownBase, viewStyles],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocBootstrapShellElement extends AbeyComponentElement {}
