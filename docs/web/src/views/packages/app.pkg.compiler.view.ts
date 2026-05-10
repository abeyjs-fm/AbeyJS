import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-compiler",
  route: "compiler",
  parent: "/packages",
  label: "@abeyjs/compiler",
  navIconFa: "fa-solid fa-gears",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/compiler</h1>
      <p class="lead">Vite plugin with enforce pre...</p>
      <ul>
        <li>Install: npm install --save-dev @abeyjs/compiler</li>\n        <li>Template control flows</li>\n        <li>abey.json at Vite root</li>\n        <li>Without this package views do not compile</li>\n        <li>Syntax reference</li>\n        <li>bindAbeyTemplate consumes</li>
      </ul>
      <p class="footnote">Web guide: OM templates (/guides/abey-templates).</p>
    </div>
  `
} as any)
export class AppPkgCompilerElement extends AbeyComponentElement {}
