import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-state",
  route: "state",
  parent: "/packages",
  label: "@abeyjs/state",
  navIconFa: "fa-solid fa-wave-square",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/state</h1>
      <p class="lead">StateCell<T> is a single-slot observable...</p>
      <ul>
        <li>Install: npm install @abeyjs/state</li>\n        <li>Good for saved filter</li>\n        <li>Re-exports routes</li>\n        <li>Not one huge immutable tree</li>\n        <li>Onboarding: README</li>\n        <li>OpenAPI/agents can write</li>
      </ul>
      <p class="footnote">Guides: AbeyJS runtime (/guides/runtime), Lists / forms data-driven (/guides/data-views).</p>
    </div>
  `
} as any)
export class AppPkgStateElement extends AbeyComponentElement {}
