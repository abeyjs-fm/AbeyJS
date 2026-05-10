import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-inspector",
  route: "inspector",
  parent: "/packages",
  label: "@abeyjs/inspector",
  navIconFa: "fa-solid fa-magnifying-glass-chart",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/inspector</h1>
      <p class="lead">Debugging kit: connectOmegaInspectorAppBridge...</p>
      <ul>
        <li>Install: npm install --save-dev @abeyjs/inspector</li>\n        <li>Full protocol</li>\n        <li>README covers</li>\n        <li>Hub port busy?</li>\n        <li>Doesn’t replace browser profiler</li>\n        <li>Typical setup</li>
      </ul>
      <p class="footnote">Guide: Monorepo / build (/guides/monorepo).</p>
    </div>
  `
} as any)
export class AppPkgInspectorElement extends AbeyComponentElement {}
