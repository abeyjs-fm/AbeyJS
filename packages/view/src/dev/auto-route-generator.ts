import fs from "node:fs";
import path from "node:path";

export interface AutoRouteOptions {
  viewsDir: string;
  outputFile: string;
  appTitle?: string;
}

export function generateAutoRoutes(options: AutoRouteOptions) {
  const { viewsDir, outputFile, appTitle = "AbeyJs App" } = options;
  const discovered: any[] = [];

  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip common non-view folders for performance
        if (["node_modules", ".git", "dist", "public", "assets", "shared", "services", "infra", "application", "domain"].includes(file)) {
          continue;
        }
        scanDir(fullPath);
      } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        // Robust check for AbeyComponent decorator
        if (/@AbeyComponent\s*\(/i.test(content)) {
          const routeMatch = content.match(/route\s*:\s*["'](.*?)["']/i);
          if (routeMatch) {
            const route = routeMatch[1];
            const parentMatch = content.match(/parent\s*:\s*["'](.*?)["']/i);
            const selectorMatch = content.match(/selector\s*:\s*["'](.*?)["']/i);
            const labelMatch = content.match(/label\s*:\s*["'](.*?)["']/i);
            const iconMatch = content.match(/navIconFa\s*:\s*["'](.*?)["']/i);
            const showInNavMatch = content.match(/showInNav\s*:\s*(true|false)/i);
            const orderMatch = content.match(/order\s*:\s*(\d+)/i);

            const relPath = path
              .relative(path.dirname(outputFile), fullPath)
              .replace(/\\/g, "/")
              .replace(/\.ts$/, ".js");

            discovered.push({
              route,
              parent: parentMatch ? parentMatch[1] : null,
              selector: selectorMatch ? selectorMatch[1] : "",
              importPath: relPath.startsWith(".") ? relPath : "./" + relPath,
              label: labelMatch ? labelMatch[1] : "",
              navIconFa: iconMatch ? iconMatch[1] : "",
              showInNav: showInNavMatch ? showInNavMatch[1] === "true" : null,
              order: orderMatch ? parseInt(orderMatch[1], 10) : 1000, // Default to a high number
            });
            console.log(`[abeyJs] Discovered: ${route} (${path.basename(fullPath)})${parentMatch ? " -> Parent: " + parentMatch[1] : ""}`);
          }
        }
      }
    }
  }

  scanDir(viewsDir);

  // Pre-calculate fullPath for all discovered components
  for (const r of discovered) {
    r.fullPath = r.parent
      ? r.parent.endsWith("/")
        ? r.parent + r.route.replace(/^\//, "")
        : r.parent + "/" + r.route.replace(/^\//, "")
      : r.route;
  }

  // 1) Synthesize missing parents (Virtual Parents)
  const knownPaths = new Set(discovered.map((d) => d.fullPath));
  const missingParents = new Set<string>();
  for (const r of discovered) {
    if (r.parent && !knownPaths.has(r.parent)) {
      missingParents.add(r.parent);
    }
  }

  for (const mp of missingParents) {
    const label = mp.split("/").pop() || mp;
    const virtualParent = {
      route: mp,
      fullPath: mp, // For virtual parents, route is the full path
      parent: null,
      selector: "app-virtual-group", 
      importPath: null, // No import needed for virtual
      label: label.charAt(0).toUpperCase() + label.slice(1),
      navIconFa: "fa-solid fa-folder",
      showInNav: true,
      isVirtual: true,
      order: 1000,
    };
    discovered.push(virtualParent);
    knownPaths.add(mp);
  }

  // Sort discovered items by order, then by label
  discovered.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.label.localeCompare(b.label);
  });

  const parentMap: Record<string, any[]> = {};
  const rootComponents: any[] = [];

  for (const r of discovered) {
    if (r.parent) {
      if (!parentMap[r.parent]) parentMap[r.parent] = [];
      parentMap[r.parent].push(r);
    } else {
      rootComponents.push(r);
    }
  }

  function generateRouteCode(r: any, indent = "    ") {
    const children = (parentMap[r.fullPath] || [])
      .filter((c) => c.showInNav !== false) // Skip hidden children in navigation menu
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.label.localeCompare(b.label);
      });

    let code = `${indent}componentRoute(\n`;
    code += `${indent}  "${r.fullPath}",\n`;
    code += `${indent}  { \n`;
    code += `${indent}    label: "${r.label}", \n`;
    code += `${indent}    title: "${r.label} · ${appTitle}", \n`;
    const finalShowInNav = r.showInNav !== null ? r.showInNav : (r.parent ? false : true);
    code += `${indent}    showInNav: ${finalShowInNav}, \n`;
    code += `${indent}    navIconFa: "${r.navIconFa}",\n`;

    if (children.length > 0) {
      code += `${indent}    navChildren: [\n`;
      for (const child of children) {
        code += `${indent}      { path: "${child.fullPath}", label: "${child.label}", navIconFa: "${child.navIconFa}" },\n`;
      }
      code += `${indent}    ]\n`;
    }

    code += `${indent}  },\n`;
    code += `${indent}  {\n`;
    code += `${indent}    selector: "${r.selector || "app-virtual-root"}",\n`;
    if (r.isVirtual) {
      code += `${indent}    load: () => Promise.resolve({ default: class extends HTMLElement {} }),\n`;
    } else {
      code += `${indent}    load: () => import("${r.importPath}"),\n`;
    }
    code += `${indent}  }\n`;
    code += `${indent})`;
    return code;
  }

  let output = `// --- GENERATED FILE - DO NOT EDIT MANUALLY ---
import { 
  componentRoute, 
  pageRoute, 
  type AppRoute, 
  type ComponentRouteNav, 
  type ComponentRouteSpec,
  type PageRouteNav,
  type PageViewSpec
} from "@abeyjs/view";

export function getRoutes(): AppRoute[] {
  const allDiscoveredRoutes: AppRoute[] = [
`;

  for (const r of discovered) {
    output += `    componentRoute(\n`;
    output += `      "${r.fullPath}",\n`;
    output += `      { label: "", title: "${r.label} · ${appTitle}", showInNav: false },\n`;
    output += `      { \n`;
    output += `        selector: "${r.selector || "app-virtual-root"}", \n`;
    if (r.isVirtual) {
      output += `        load: () => Promise.resolve({ default: class extends HTMLElement {} })\n`;
    } else {
      output += `        load: () => import("${r.importPath}")\n`;
    }
    output += `      }\n`;
    output += `    ),\n`;
  }

  output += `  ];

  return [
    ...allDiscoveredRoutes,

    // Root-level Navigation Nodes (the ones that show in sidebar)
`;

  for (const r of rootComponents) {
    output += generateRouteCode(r, "    ") + ",\n";
  }

  output += `
    pageRoute(
      "*",
      { label: "", title: "Not found", showInNav: false },
      {
        heading: "404",
        lead: "That page does not exist.",
      }
    ),
  ];
}
`;

  fs.writeFileSync(outputFile, output);
  console.log(`[abeyJs] Generated compatible total routes in ${outputFile}`);
}
