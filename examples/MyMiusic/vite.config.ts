import { defineConfig } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyVitePlugin } from "@abeyjs/compiler";

/**
 * Cada `import()` en rutas (lazyViewMount) genera un chunk aparte: menos JS en el primer
 * request; el resto se baja al visitar /ejemplo, /panel, etc. Revisa `dist/assets/*.js` tras `npm run build`.
 */
export default defineConfig({
  appType: "spa",
  clearScreen: false,
  customLogger: createAbeyViteLogger(),
  plugins: [abeyVitePlugin()],
  server: {
    port: 5170,
    proxy: {
      "/api/deezer": {
        target: "https://api.deezer.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/deezer/, ""),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
  },
});
