import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-core",
  route: "core",
  parent: "/packages",
  label: "@abeyjs/core",
  navIconFa: "fa-solid fa-circle-nodes",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/core</h1>
      <p class="lead">Lowest layer, no UI...</p>
      <ul>
        <li>Install: npm install @abeyjs/core</li>\n        <li>intentOf + OmegaIntent</li>\n        <li>createChannel</li>\n        <li>omegaIntentNameDottedCamel</li>\n        <li>OmegaTypedIntent</li>\n        <li>No DOM or routes</li>\n        <li>Read header</li>
      </ul>
      <p class="footnote">Guides: Introduction (/guides/intro), AbeyJS runtime (/guides/runtime).</p>
    </div>
  `
} as any)
export class AppPkgCoreElement extends AbeyComponentElement {}
