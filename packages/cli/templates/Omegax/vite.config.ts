import { defineConfig } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyVitePlugin } from "@abeyjs/compiler";

export default defineConfig({
  appType: "spa",
  clearScreen: false,
  customLogger: createAbeyViteLogger(),
  plugins: [abeyVitePlugin()],
  server: { port: 5170 },
});
