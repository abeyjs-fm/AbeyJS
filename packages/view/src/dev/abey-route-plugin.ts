import type { Plugin, ViteDevServer } from "vite";
import { generateAutoRoutes, type AutoRouteOptions } from "./auto-route-generator.js";
import path from "node:path";
import fs from "node:fs";

export function abeyViteRoutePlugin(options: AutoRouteOptions): Plugin {
  const viewsDir = options.viewsDir || "src";
  const absViewsDir = path.resolve(process.cwd(), viewsDir);
  const absOutputFile = path.resolve(process.cwd(), options.outputFile);

  function run() {
    try {
      console.log(`[abeyJs] Scanning ${viewsDir} for components...`);
      generateAutoRoutes({ ...options, viewsDir });
    } catch (err) {
      console.error("[abeyJs] Error generating routes:", err);
    }
  }

  return {
    name: "abey-vite-route-plugin",
    
    configResolved() {
      // Generate once on startup
      run();
    },

    configureServer(server: ViteDevServer) {
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        const port = typeof address === "object" ? address?.port : null;
        if (port) {
          setTimeout(() => {
            console.log(`\n  \x1B[32m\x1B[1mAbeyJs\x1B[22m\x1B[39m \x1B[2mready at\x1B[22m \x1B[36mhttp://localhost:${port}/\x1B[39m\n`);
          }, 100);
        }
      });
      
      const watcher = server.watcher;

      // Watch for additions, removals and changes in the views directory
      watcher.on("add", (file) => {
        if (file.startsWith(absViewsDir) && (file.endsWith(".ts") || file.endsWith(".js"))) {
          run();
        }
      });

      watcher.on("unlink", (file) => {
        const absFile = path.resolve(process.cwd(), file);
        if (absFile === absOutputFile || (absFile.startsWith(absViewsDir) && (absFile.endsWith(".ts") || absFile.endsWith(".js")))) {
          run();
        }
      });

      // We might want to watch for changes too if metadata (label/route) changes
      watcher.on("change", (file) => {
        if (file.startsWith(absViewsDir) && (file.endsWith(".ts") || file.endsWith(".js"))) {
          // Check if it actually contains @AbeyComponent or if it was modified
          const content = fs.readFileSync(file, "utf-8");
          if (content.includes("@AbeyComponent")) {
            run();
          }
        }
      });
    }
  };
}
