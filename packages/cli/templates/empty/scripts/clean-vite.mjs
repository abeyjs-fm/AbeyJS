import { rmSync } from "node:fs";
try {
  rmSync("node_modules/.vite", { recursive: true, force: true });
} catch {
  /* no cache */
}
