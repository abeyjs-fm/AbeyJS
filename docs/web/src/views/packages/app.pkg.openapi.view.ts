import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-openapi",
  route: "openapi",
  parent: "/packages",
  label: "@abeyjs/openapi",
  navIconFa: "fa-solid fa-file-code",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/openapi</h1>
      <p class="lead">Reads an OpenAPI document...</p>
      <ul>
        <li>Install: npm install @abeyjs/openapi</li>\n        <li>Common APIs</li>\n        <li>jsonObjectSchemaToZod</li>\n        <li>HTTP stays in @abeyjs/http</li>\n        <li>Paths don’t match heuristics</li>\n        <li>CLI codegen</li>
      </ul>
      <p class="footnote">Guides: CRUD (/guides/crud-auto), product vision (/guides/vision).</p>
    </div>
  `
} as any)
export class AppPkgOpenapiElement extends AbeyComponentElement {}
