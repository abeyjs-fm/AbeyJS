import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-flows",
  route: "flows",
  parent: "/packages",
  label: "@abeyjs/flows",
  navIconFa: "fa-solid fa-diagram-project",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/flows</h1>
      <p class="lead">Flow engine: createOmegaFlowManager...</p>
      <ul>
        <li>Install: @abeyjs/flows is pulled by runtime</li>\n        <li>OmegaFlow machine</li>\n        <li>navigationIntentEvent</li>\n        <li>OmegaIntentHandlerContext</li>\n        <li>Snapshots</li>\n        <li>Flow-reactive tables</li>
      </ul>
      <p class="footnote">Guides: AbeyJS runtime (/guides/runtime), Tables / flows (/guides/table-flows).</p>
    </div>
  `
} as any)
export class AppPkgFlowsElement extends AbeyComponentElement {}
