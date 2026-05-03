import { defineConfig } from "vite";
import { createAbeyViteLogger } from "@abeyjs/view/dev/vite-logger";
import { abeyViteMalformedUriGuard } from "@abeyjs/view/dev/vite-malformed-uri-guard";
import { abeyVitePlugin } from "@abeyjs/compiler";

export default defineConfig({
  appType: "spa",
  clearScreen: false,
  customLogger: createAbeyViteLogger(),
  plugins: [abeyViteMalformedUriGuard(), abeyVitePlugin()],
  server: { port: 5170 },
});
