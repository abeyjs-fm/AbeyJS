import { defineConfig } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyViteMalformedUriGuard } from "@abeyjs/view/dev/vite-malformed-uri-guard";
import { abeyViteRoutePlugin } from "@abeyjs/view/dev/abey-route-plugin";
import { abeyVitePlugin } from "@abeyjs/compiler";

/**
 * Cada `import()` en rutas (lazyViewMount) genera un chunk aparte: menos JS en el primer
 * request; el resto se baja al visitar /ejemplo, /panel, etc. Revisa `dist/assets/*.js` tras `npm run build`.
 */
export default defineConfig({
  appType: "spa",
  clearScreen: false,
  customLogger: createAbeyViteLogger(),
  plugins: [
    abeyViteMalformedUriGuard(),
    abeyViteRoutePlugin({
      viewsDir: "src",
      outputFile: "src/routes.generated.ts",
      appTitle: "AbeyJs Admin",
    }),
    abeyVitePlugin(),
  ],
  server: { port: 5170 },
  build: {
    chunkSizeWarningLimit: 500,
  },
});
