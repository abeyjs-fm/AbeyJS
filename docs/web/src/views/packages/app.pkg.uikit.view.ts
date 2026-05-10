import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-uikit",
  route: "uikit",
  parent: "/packages",
  label: "@abeyjs/uikit",
  navIconFa: "fa-solid fa-table-cells",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/uikit</h1>
      <p class="lead">abey-* custom elements from helpers...</p>
      <ul>
        <li>Install: npm install @abeyjs/uikit</li>\n        <li>registerAbeyJsUi()</li>\n        <li>AbeyTableElement</li>\n        <li>AbeyFormElement</li>\n        <li>classToAbeyFormConfig</li>\n        <li>Table/flow integration</li>
      </ul>
      <p class="footnote">Guides: Tables (/guides/tables), Tables / flows (/guides/table-flows).</p>
    </div>
  `
} as any)
export class AppPkgUikitElement extends AbeyComponentElement {}
