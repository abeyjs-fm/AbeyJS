import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-validation",
  route: "validation",
  parent: "/packages",
  label: "@abeyjs/validation",
  navIconFa: "fa-solid fa-check-double",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/validation</h1>
      <p class="lead">Thin layer on zod...</p>
      <ul>
        <li>Install: npm install @abeyjs/validation</li>\n        <li>safeParseWithErrors</li>\n        <li>Pairs well with uikit</li>\n        <li>jsonObjectSchemaToZod</li>\n        <li>Strong server rules win</li>\n        <li>Package README</li>
      </ul>
      <p class="footnote">Guides: CRUD (/guides/crud-auto), Entities / forms (/guides/entities-forms).</p>
    </div>
  `
} as any)
export class AppPkgValidationElement extends AbeyComponentElement {}
