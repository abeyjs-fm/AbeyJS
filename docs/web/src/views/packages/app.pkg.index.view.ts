import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-index",
  route: "/packages",
  label: "Tools",
  navIconFa: "fa-solid fa-toolbox",
  template: `
    <div class="abey-doc-card">
      <h1>Tools · @abeyjs packages</h1>
      <p class="lead">In the sidebar, each row under Tools opens a card for an npm package published as @abeyjs/*.</p>
    </div>
  `
} as any)
export class AppPkgIndexElement extends AbeyComponentElement {}
