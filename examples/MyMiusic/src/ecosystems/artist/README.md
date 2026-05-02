# Ecosystem: Artist

Este directorio agrupa todo el código del ecosistema **Artist**.

## Carpetas
- **model/**: tipos/DTOs puros (sin runtime, sin side effects). Ej: `ArtistRow`, payloads, etc.
- **data/**: acceso a datos (HTTP/repos/mocks/cache). No debería tocar DOM.
- **omega/**: núcleo AbeyJs del ecosistema:
  - `semantics.ts`: strings únicos (intents/events/ids).
  - `music-agent.ts` / `music-behavior.ts`: agente y reglas (opcional).
  - `music-flow.ts`: casos de uso (onIntent/onEvent) → emite events/expressions.
  - `music-register.ts`: instalación en runtime (wire de intents + activación del flow).
- **ui/**: UI (templates + estilos + mount). Dispara intents y consume events/expressions.

## Convención de flujo
- UI → **intent** (`Artist/TableLoad`, etc.)
- Flow → **event** (`omega/ecosystem/artist/...`)

## Compiler demo

Este repo incluye un demo del compiler (`@abeyjs/compiler`) en:

- Ruta: `/alumnos-compiler`
- Archivo: `src/ecosystems/alumnos/ui/app-alumnos-compiler.view.html`

Bindings que se prueban: `(click)`, `[(model)]`, `[class.*]`, `[attr.*]`.

