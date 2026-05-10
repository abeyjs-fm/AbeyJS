import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-runtime",
  route: "runtime",
  parent: "/packages",
  label: "@abeyjs/runtime",
  navIconFa: "fa-solid fa-bolt",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/runtime</h1>
      <p class="lead">Typical single OmegaRuntime instance...</p>
      <ul>
        <li>Install: npm install @abeyjs/runtime</li>\n        <li>OmegaPlugin / OmegaModule</li>\n        <li>CRUD-friendly HTTP client</li>\n        <li>intentFromQuery</li>\n        <li>Flows emit intents</li>\n        <li>One omegaSetup.ts per app</li>
      </ul>
      <p class="footnote">Guide: AbeyJS runtime (/guides/runtime).</p>
    </div>
  `
} as any)
export class AppPkgRuntimeElement extends AbeyComponentElement {}
