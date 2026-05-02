import { intentOf } from "@abeyjs/core";
import { DOM_CHANNEL_FACTORY, DOM_CHANNEL_TOKEN, AbeyComponent, AbeyComponentElement } from "@abeyjs/view";
import { template } from "./app.dataaaa.view.html";
import sliceCss from "./app.dataaaa.view.css?inline";
import { DataaaaEcosystem } from "../omega/semantics.js";

@AbeyComponent({
  selector: "app-dataaaa",
  template,
  stylesText: [sliceCss],
  providers: [{ token: DOM_CHANNEL_TOKEN, useFactory: DOM_CHANNEL_FACTORY }],
} as any)
export class AppDataaaaElement extends AbeyComponentElement {
  connectedCallback(): void {
    const host = this;
    this.state = {
      banner: "—",
      tick: () => {
        host.#tick();
      },
    };
    super.connectedCallback();
    queueMicrotask(() => {
      if (!host.isConnected) return;
      host.#wire();
    });
  }

  #tick(): void {
    const runtime = this.runtime;
    if (!runtime) return;
    void runtime.dispatch(intentOf(DataaaaEcosystem.intentTick, { at: Date.now() }), { source: "dataaaa-ui" });
  }

  #wire(): void {
    const channel = (this as any).channel?.() as any;
    if (!channel?.on) return;
    this.onDestroy(
      channel.on(DataaaaEcosystem.eventTicked, (data: unknown) => {
        this.state = { ...this.state, banner: `ticked: ${JSON.stringify(data)}` };
      }),
    );
  }
}
