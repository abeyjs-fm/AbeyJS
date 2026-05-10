import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-cli",
  route: "cli",
  parent: "/packages",
  label: "@abeyjs/cli",
  navIconFa: "fa-solid fa-terminal",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/cli</h1>
      <p class="lead">The abeyjs executable is reproducible scaffolding...</p>
      <ul>
        <li>Global: npm install -g @abeyjs/cli</li>\n        <li>abeyjs init</li>\n        <li>abeyjs connect</li>\n        <li>abeyjs generate ecosystem</li>\n        <li>Keeps vite.config sane</li>\n        <li>npm install, npm run dev</li>
      </ul>
      <p class="footnote">Guides: CLI (/guides/cli), Quick start (/guides/quick-start).</p>
    </div>
  `
} as any)
export class AppPkgCliElement extends AbeyComponentElement {}
