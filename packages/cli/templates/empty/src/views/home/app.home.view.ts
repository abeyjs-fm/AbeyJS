import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.home.view.html";
import homeCss from "./app.home.view.css?inline";
import pkg from "../../../package.json";

const SAMPLE_JSON = `{
  "app": {
    "title": "My App",
    "version": "1.0.0",
    "pages": []
  }
}`;

@AbeyComponent({
  selector: "app-home-view",
  template,
  stylesText: [homeCss],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppHomeViewElement extends AbeyComponentElement {
  connectedCallback(): void {
    const host = this;
    this.state = {
      starterVersion: pkg.version,
      copyLabel: "Copy",
      starterCmd: "cd my-app\n  npm run dev",
      sampleJson: SAMPLE_JSON,
      copyStarterCmd: () => {
        const cmd = String(host.state.starterCmd ?? "");
        void navigator.clipboard.writeText(cmd);
        host.state = { ...host.state, copyLabel: "Copied!" };
        window.setTimeout(() => {
          host.state = { ...host.state, copyLabel: "Copy" };
        }, 1800);
      },
    };
    super.connectedCallback();
  }
}
