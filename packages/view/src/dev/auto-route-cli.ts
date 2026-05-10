import { generateAutoRoutes } from "./auto-route-generator.js";
import path from "node:path";

const args = process.argv.slice(2);
const viewsDir = args[0] || "src/views";
const outputFile = args[1] || "src/routes.generated.ts";
const appTitle = args[2] || "AbeyJs Docs";

const absoluteViewsDir = path.resolve(process.cwd(), viewsDir);
const absoluteOutputFile = path.resolve(process.cwd(), outputFile);

generateAutoRoutes({
  viewsDir: absoluteViewsDir,
  outputFile: absoluteOutputFile,
  appTitle
});
