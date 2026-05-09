import { createOmegaRuntime, type OmegaRuntime } from "@abeyjs/runtime";
import { registerDeezerHttpModule } from "./shared/htpp/http-providers";
import { installArtistOmega } from "./views/utils/abey-table-for-api/omega/register";
import { installStudentsOmega } from "./views/utils/students/omega/register";

export function createOmega(): { runtime: OmegaRuntime } {
  const runtime = createOmegaRuntime();
  runtime.registerModule(registerDeezerHttpModule);
  installArtistOmega(runtime);
  installStudentsOmega(runtime);
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--abey-slice-max-width", "90%");
  }
  return { runtime };
}
