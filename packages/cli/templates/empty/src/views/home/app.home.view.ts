/// <reference path="../../env.d.ts" />
import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.home.view.html";
import homeCssUrl from "./app.home.view.css?url";

@AbeyComponent({
  selector: "app-home-view",
  template,
  stylesHrefs: [homeCssUrl],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppHomeViewElement extends AbeyComponentElement {}

