# Ecosystem: Dataaaa

This folder holds the vertical slice for **Dataaaa**.

## Layout
- **model/** — Plain types/DTOs (no runtime, no side effects). Example: `DataaaaRow`, payloads.
- **data/** — Data access (HTTP/repos/mocks/cache). Keep DOM out of here.
- **omega/** — AbeyJs core for the slice:
  - `semantics.ts` — stable strings (intents/events/ids).
  - `*-agent.ts` / `*-behavior.ts` — agent + rules.
  - `*-flow.ts` — `onIntent` / `onEvent` orchestration → channel events + UI expressions.
  - `register.ts` — runtime install (intent wiring + flow activation).
- **ui/** — AbeyComponent + OM (import con template desde .view.html), CSS con ?inline y stylesText; misma convención que la plantilla **admin** con abeyVitePlugin.

## Flow convention
- UI → **intent** (`Dataaaa/TableLoad`, etc.)
- Flow → **event** (`omega/ecosystem/dataaaa/...`)

