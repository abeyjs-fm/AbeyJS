import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.docs.home.view.html";
import homeCss from "./app.docs.home.view.css?inline";

@AbeyComponent({
  selector: "app-docs-home",
  template,
  stylesText: [homeCss],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDocsHomeElement extends AbeyComponentElement {}
