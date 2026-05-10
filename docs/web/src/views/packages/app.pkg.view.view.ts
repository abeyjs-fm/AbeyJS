import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-view",
  route: "view",
  parent: "/packages",
  label: "@abeyjs/view",
  navIconFa: "fa-solid fa-window-restore",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/view</h1>
      <p class="lead">DOM view layer: app bootstrap...</p>
      <ul>
        <li>Typical peer: zod</li>\n        <li>mountRoutedApp + outlets</li>\n        <li>PathRouter</li>\n        <li>Data-driven: mountListView</li>\n        <li>registerAbeyJsUi()</li>\n        <li>inject, injectFromDom</li>\n        <li>Detailed exports</li>
      </ul>
      <p class="footnote">Guides: Bootstrap / shell (/guides/routing), @AbeyComponent (/guides/abey-component).</p>
    </div>
  `
} as any)
export class AppPkgViewElement extends AbeyComponentElement {}
