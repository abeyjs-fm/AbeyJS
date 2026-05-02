import { defineConfig } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyVitePlugin } from "@abeyjs/compiler";

/** Sitio tipo “framework docs”: SPA AbeyJs con guías en OM (`*.view.html`). */
export default defineConfig({
  appType: "spa",
  clearScreen: false,
  customLogger: createAbeyViteLogger(),
  plugins: [abeyVitePlugin()],
  server: {
    port: 5190,
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
});
