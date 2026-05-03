# Implementación `abey-table` (Omega + datos remotos)

Referencia pensada para el **árbol del editor**: una lista completa frente al texto guiado que está en **`ui/app-abey-table.view.html`** (demo en el navegador).

**Repositorio público (organización GitHub declarada en el monorepo):** [https://github.com/abeyjs-fm](https://github.com/abeyjs-fm)

## Local (solo cliente) versus Omega + red

| Aspecto | Local (`config` en TS) | Omega + `loadNetwork` (esta demo) |
|--------|-------------------------|-------------------------------------|
| Origen de filas | Asignás `rows` / columnas sin async en el mismo proceso | Repositorio o API en el **agente**; la tabla muestra skeleton hasta **`eventItems`** |
| Paginación / búsqueda | Opcionalmente filtro en cliente (`loadNetwork=false`) | Cada cambio **`page`**, **`pageSize`** o texto de búsqueda disparan **`intentLoad`** con **`query`** |
| Contrato datos | Todo en `AbeyTableConfig` | **`eventcolumns`**, **`eventactions`**, **`eventitems`** enlazados por string a **`semantics`** |
| Runtime global | Opcional | **`bootstrapOmegaApp`** + **`exposeBootstrapRuntime`** ⇒ **`globalThis.__abeyRuntime`** |
| Registrar CE | **`registerAbeyJsUi()`** | Igual + **`AbeyTableElement.define("abey-table")`** antes del primer uso en ese fragmento |

No son excluyentes: podés tener flow para columnas y seguir poblando algunas cosas desde `config` inicial (aquí **`#wire`** pone **`getRowId`** y placeholders vacíos hasta el primer **`eventItems`**).

---

## Lista de trabajo (orden sugerido en el proyecto)

Numerado como si armaras el feature desde cero dentro de **`docs/web`** o un slice equivalente:

1. **Dependencias NPM** ya presentes en el workspace: **`@abeyjs/uikit`**, **`@abeyjs/view`**, **`@abeyjs/runtime`**, **`@abeyjs/http`**, **`@abeyjs/agents`**, **`@abeyjs/flows`**, **`@abeyjs/core`** (`intentOf`).
2. **Estilos de tabla**: en shadow (`@AbeyComponent`): import **`@abeyjs/uikit/styles/abey-table.css?inline`** en **`stylesText`**. Sin shadow: **`abey.json`** `styles` o import global del mismo archivo (ver **`docs/quick-start`**).
3. **Arranque de la SPA**: en **`docs/web/src/main.ts`**, llamar **`registerAbeyJsUi()`** antes de rutas OM que monten vistas con **`abey-table`**.
4. **Omega bootstrap**: **`createOmega()`** debe registrar módulos (HTTP, tokens) **antes** del **`install*Omega(runtime)`**. En docs: **`docs/web/src/omegaSetup.ts`** + **`installArtistOmega(runtime)`**.
5. **Semántica única**: en **`omega/semantics.ts`**, intents y topics de **`channel.emit`** como constantes (**`ArtistEcosystem`**). Copiá patrones pero **no reutilices strings mágicos** en HTML sin pasar por aquí (si no cuadran, la tabla parece vacía).
6. **Agente**: **`omega/agent.ts`** implementa **`onAction`** (ej. **`loadTable`**) usando **`OmegaHttp`** inyectado; emite payloads de columnas / acciones / ítems.
7. **Behavior**: **`omega/behavior.ts`** mapea **nombre de intent** (string) → **acción** del agente.
8. **Flow**: **`omega/flow.ts`** ejecuta intents y opcionalmente publica **`OmegaFlowExpression`** para chips de estado.
9. **Registro Omega**: **`omega/register.ts`**: **`runtime.onIntent`** por cada intent, **`registerAgent`**, **`registerFlow`**, **`runtime.flow.activate(flow.id)`**.
10. **Vista OM**: **`ui/app-abey-table.biew.ts`** + **`app-abey-table.view.html`**: **`DOM_CHANNEL_FACTORY`**, **`state`** con las mismas cadenas que **`semantics`**, **`#wire`** con **`AbeyTableElement.define`** y opcional **`table.config`** mínimo (**`getRowId`**).
11. **Ruta**: entrada en **`docs/web/src/utils-routes.ts`** y **`routes.ts`** (lazy import del **`biew`**).
12. **Prueba manual**: página **`/abey-table`**, búsqueda (debounce + Enter/blur flush), cambio de página, selección si **`intentselection`** está definido.

---

## Archivos vs responsabilidad (este ejemplo)

Rutas relativas a **`docs/web/src/views/utils/abey-table-for-api/`** salvo donde se indique.

| Archivo | Responsabilidad |
|---------|----------------|
| **`model/`** | Tipos de filas y DTO (`DeezerArtist`, etc.). Sin DOM ni `fetch` directo en la vista. |
| **`data/artist.repo.ts`** | Una fuente paginada: **`page({ page, pageSize, query })`**. Llama **`OmegaHttp`**. |
| **`omega/semantics.ts`** | Contrato de nombres: **`intentLoadTable`**, **`eventTableItems`**, **`flowId`**, … |
| **`omega/behavior.ts`** | **`Artist/TableLoad`** → **`loadTable`**; selection / action idem. |
| **`omega/agent.ts`** | Ejecuta carga HTTP, **`emit`** columnas acciones ítems, manejo de error con **`eventTableItems`** vacíos si aplica. |
| **`omega/flow.ts`** | Orquesta intents en el **`ArtistFlow`**; expresiones para UI opcional. |
| **`omega/register.ts`** | Wire completo **`installArtistOmega(runtime)`**. |
| **`ui/app-abey-table.biew.ts`** | Componente **`app-abey-table`**: define CE, **`config`**, suscripción flow para chip de estado. |
| **`ui/app-abey-table.view.html`** | Markup **`abey-table`** + **`data-abey-cell`** + panel explicativo. |
| **`ui/app-abey-table.view.css`** | Look del hero/documentación/demo. |
| **`docs/web/src/omegaSetup.ts`** | **`installArtistOmega`** después de registrar HTTP ( **`registerDeezerHttpModule`** ). |
| **`docs/web/src/main.ts`** | **`registerAbeyJsUi()`**, **`bootstrapOmegaApp`**, **`createOmega`**. |

---

## Contrato rápido: atributos HTML ↔ backend

Los atributos de la tabla deben ser **literales coincidentes** con **`ArtistEcosystem`** (o tus constantes nuevas):

- **`flow="true"`** — suscripción a **`channel.onAll`**.
- **`loadNetwork="true"`** — **`query`** va al servidor; no se re-filtra en cliente sobre **`rows`**.
- **`intentload`**, **`intentselection`**, **`intentaction`** — lo que **`runtime.dispatch`** emite cuando el usuario interactúa.
- **`eventcolumns`**, **`eventactions`**, **`eventitems`** — nombres de eventos que publica tu agente.
- Opcional **`intentsearch`** — intent separado solo para búsqueda si no querés cargar tabla con **`intentLoad`** único.

Payload típico de **`eventItems`**: **`items`**, **`totalItems`**, **`page`**, **`pageSize`**. Sin **`dispatch`** válido (**`globalThis.__abeyRuntime`**) los intents no llegan.

---

## Comportamiento del buscador (kit)

Debounced por defecto (**`AbeyTableElement.searchDebounceMs`**). También ejecuta pendiente en salida real del campo, clic fuera (cuando pierde sticky focus) y **Enter** si quedaba un disparo aplazado. Ver código en **`packages/uikit/src/table/abey-table.ts`**.

---

## Documentación adicional del monorepo

- **`docs/abey-table.md`** — runtime en **`globalThis`**, uso básico TS.
- **`docs/abey-table-flows.md`** — payloads JSON de ejemplo.

La ruta **`/abey-table`** en docs web ejecuta esta implementación línea sobre línea con el panel del HTML como guía rápida y este README como **checklist revisable desde el IDE**.
