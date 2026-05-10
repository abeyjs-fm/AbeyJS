import { defineConfig } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyViteMalformedUriGuard } from "@abeyjs/view/dev/vite-malformed-uri-guard";
import { abeyViteRoutePlugin } from "@abeyjs/view/dev/abey-route-plugin";
import { abeyVitePlugin } from "@abeyjs/compiler";

export default defineConfig({
  appType: "spa",
  clearScreen: false,
  customLogger: createAbeyViteLogger(),
  plugins: [
    abeyViteMalformedUriGuard(),
    abeyViteRoutePlugin({
      viewsDir: "src",
      outputFile: "src/routes.generated.ts",
      appTitle: "AbeyJs App",
    }),
    abeyVitePlugin(),
  ],
  server: { port: 5170 },
});
