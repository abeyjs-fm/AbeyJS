Generated app (blank starter or admin shell).
1. cd "C:\Proyectos_Yeferson\AbeyJs\examples\mi-admin"
2. npm run dev
3. Routes: src/routes.ts · home: src/home/home.ts (+ home.view.html/home.css) · intents/runtime: src/omegaSetup.ts · flows: src/flows · HTTP: src/services/http.ts (optional: --shell appbar)
4. Baseline: `src/flows/*` (helpers + intent/channel glue) + `src/services/http.ts` + `runtime.onIntent(...)` / `runtime.channel` in `src/omegaSetup.ts`.
5. After `abeyjs connect`, run `abeyjs generate views` (default `--scaffold minimal`). Extra layers: `--scaffold full`.