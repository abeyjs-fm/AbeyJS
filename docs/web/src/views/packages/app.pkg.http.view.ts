import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-http",
  route: "http",
  parent: "/packages",
  label: "@abeyjs/http",
  navIconFa: "fa-solid fa-globe",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/http</h1>
      <p class="lead">JSON-focused client around fetch...</p>
      <ul>
        <li>Install: npm install @abeyjs/http</li>\n        <li>get/post JSON</li>\n        <li>Does not change server policy</li>\n        <li>Good for mocking</li>\n        <li>Typical integration</li>\n        <li>Caches and invalidation</li>
      </ul>
      <p class="footnote">Guides: Automatic CRUD (/guides/crud-auto), product vision (/guides/vision).</p>
    </div>
  `
} as any)
export class AppPkgHttpElement extends AbeyComponentElement {}
