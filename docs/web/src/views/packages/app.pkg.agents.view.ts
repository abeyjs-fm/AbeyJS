import { AbeyComponent, AbeyComponentElement } from "@abeyjs/view";

@AbeyComponent({
  selector: "app-pkg-agents",
  route: "agents",
  parent: "/packages",
  label: "@abeyjs/agents",
  navIconFa: "fa-solid fa-robot",
  template: `
    <div class="abey-doc-card">
      <h1>@abeyjs/agents</h1>
      <p class="lead">OmegaAgent, OmegaStatefulAgent...</p>
      <ul>
        <li>Install: npm install @abeyjs/agents</li>\n        <li>OmegaStatefulAgent bundles</li>\n        <li>OmegaAgentBehaviorRule</li>\n        <li>Protocol/message types</li>\n        <li>Not microservices</li>\n        <li>abeyjs generate ecosystem</li>
      </ul>
      <p class="footnote">Main guide: AbeyJS runtime (/guides/runtime).</p>
    </div>
  `
} as any)
export class AppPkgAgentsElement extends AbeyComponentElement {}
