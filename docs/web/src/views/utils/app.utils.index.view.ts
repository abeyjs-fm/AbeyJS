import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-utils-index",
  route: "/utils",
  label: "Utils",
  navIconFa: "fa-solid fa-tools",
  template: `
    <div class="abey-doc-card">
      <h1>Utilities</h1>
      <p class="lead">Internal tools and demos.</p>
    </div>
  `
} as any)
export class AppUtilsIndexElement extends AbeyComponentElement {}
