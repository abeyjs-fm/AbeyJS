# Implementación `abey-table` (Omega + datos remotos)

Este texto es cómo armé el ejemplo **`abey-table-for-api`** dentro de **`docs/web`**: la demo vive en la ruta **`/abey-table`** y el panel largo está en **`ui/app-abey-table.view.html`**. Este README es el mismo mapa, pero desde el lado del código en el explorador.

**Repo público:** [https://github.com/abeyjs-fm](https://github.com/abeyjs-fm)

## Por qué no es solo “tabla con config”

Quería mostrar tabla con **paginación y búsqueda contra red**, sin meter `fetch` en la plantilla. La tabla en modo **`flow`** dispara intents; yo respondo en el agente con eventos (**`emit`**) para columnas, acciones e ítems. Esa separación obliga a tener un contrato claro de nombres (**`ArtistEcosystem`** en **`omega/semantics.ts`**) y un runtime disponible (**`globalThis.__abeyRuntime`** después del bootstrap Omega).

| Aspecto | Local (`config` en TS) | Omega + `loadNetwork` (esta demo) |
|--------|-------------------------|-------------------------------------|
| Origen de filas | `rows` / columnas síncronos en el mismo proceso | Repo o API en el **agente**; skeleton hasta el primer **`eventItems`** |
| Paginación / búsqueda | Podés filtrar en cliente (`loadNetwork=false`) | Cada cambio **`page`**, **`pageSize`** o búsqueda dispara **`intentLoad`** con **`query`** |
| Contrato datos | Todo en **`AbeyTableConfig`** | **`intent*`** / **`event*`** enlazados por string a **`semantics`** |
| Runtime global | Opcional | **`bootstrapOmegaApp`** + **`exposeBootstrapRuntime`** ⇒ **`__abeyRuntime`** |
| Custom element | **`registerAbeyJsUi()`** | Igual, y **`AbeyTableElement.define("abey-table")`** en **`#wire`** antes de que exista el tag |

Las dos modalidades pueden mezclarse: en **`#wire`** dejé **`getRowId`** y un **`config` mínimo** mientras el primer **`eventItems`** llega por canal.

## Cómo quedó el árbol (desde **`docs/web/src/`**)

```
docs/web/src/
├── main.ts                               # registerAbeyJsUi + bootstrap Omega
├── omegaSetup.ts                         # installArtistOmega
├── utils-routes.ts                       # /abey-table
├── routes.ts                             # lazy del biew
└── views/utils/abey-table-for-api/
    ├── README.md
    ├── ui/
    │   ├── app-abey-table.biew.ts        # componente + #wire + state
    │   ├── app-abey-table.view.html      # markup + guía embebida
    │   └── app-abey-table.view.css
    ├── omega/
    │   ├── semantics.ts                  # nombres canónicos (intents/events)
    │   ├── behavior.ts                   # intent string → acción agente
    │   ├── agent.ts                      # loadTable + emits
    │   ├── flow.ts
    │   └── register.ts                   # installArtistOmega(runtime)
    ├── data/
    │   └── artist.repo.ts                # page({ page, pageSize, query })
    └── model/
        └── artist.types.ts
```

Todo lo que ves en **`abey-table-for-api/`** es autocontenido salvo el **enganche**: **`main.ts`**, **`omegaSetup.ts`** y las dos entradas de ruta tienen que conocer **`installArtistOmega`** y el import del **`biew`**.

## Orden en el que yo lo fue armando

Si repetís el feature en otro slice, este es el orden que me funcionó:

1. **Deps del workspace**: **`@abeyjs/uikit`**, **`@abeyjs/view`**, **`@abeyjs/runtime`**, **`@abeyjs/http`**, **`@abeyjs/agents`**, **`@abeyjs/flows`**, **`@abeyjs/core`** (`intentOf`).
2. **CSS del kit**: en componente con shadow, **`@abeyjs/uikit/styles/abey-table.css?inline`** en **`stylesText`**; si no hay shadow, **`abey.json`** / import global (ver **`docs/quick-start`**).
3. **`main.ts`**: **`registerAbeyJsUi()`** antes de montar vistas con **`abey-table`**.
4. **Bootstrap Omega**: **`createOmega()`** con módulos (HTTP, etc.) **antes** de llamar **`installArtistOmega(runtime)`**; en docs eso está en **`omegaSetup.ts`** (después del registro Deezer/`OmegaHttp`).
5. **`semantics.ts`**: una sola fuente de verdad para intents y topics; el HTML debe usar **literales iguales** — si mandás un typo, la tabla queda vacía sin error obvio.
6. **`agent.ts`**: **`onAction("loadTable", payload)`** leyendo **`page`**, **`pageSize`**, **`query`**; llamo al repo y **emito** columnas / acciones / ítems (y vacío ante error si aplica).
7. **`behavior.ts`**: traduje **`Artist/TableLoad`** → **`loadTable`** (y lo mismo para selection/action si los usás).
8. **`flow.ts`**: orquestación del **`ArtistFlow`**; opcional para expresiones en UI.
9. **`register.ts`**: **`runtime.onIntent`**, **`registerAgent`**, **`registerFlow`**, **`runtime.flow.activate(flow.id)`** — exporté **`installArtistOmega`** como punto único.
10. **Vista OM**: **`biew`** con **`DOM_CHANNEL_FACTORY`**, **`state`** con los mismos strings que **`semantics`**, **`#wire`** donde defino **`abey-table`** y el **`table.config`** mínimo.
11. **Rutas**: **`utils-routes.ts`** + **`routes.ts`** con lazy load del **`biew`**.
12. **Smoke test**: **`/abey-table`**, búsqueda (debounce + flush en blur/Enter), paginación, selección si activaste **`intentselection`**.

## Qué hace cada pieza en este ejemplo

- **`model/`**: tipos (**`DeezerArtist`**, etc.); ni DOM ni **`fetch`** directo desde la vista.
- **`data/artist.repo.ts`**: contrato **`page(...)`**; internamente **`OmegaHttp`**.
- **`omega/semantics.ts`**: **`intentLoadTable`**, **`eventTableItems`**, **`flowId`**, … todo lo que después repetís entre HTML y TS.
- **`omega/agent.ts`**: la parte “sale a la API y vuelve con eventos”.
- **`omega/register.ts`**: el **`install*`** que enganchás desde **`omegaSetup.ts`**.

## Contrato rápido: atributos de la tabla

En **`app-abey-table.view.html`** los atributos tienen que coincidir con **`ArtistEcosystem`**:

- **`flow="true"`** — la tabla escucha el canal (**`channel.onAll`**).
- **`loadNetwork="true"`** — **`query`** viaja al servidor; no re-filtro cliente sobre **`rows`**.
- **`intentload`**, **`intentselection`**, **`intentaction`** — lo que dispara **`runtime.dispatch`** al interactuar.
- **`eventcolumns`**, **`eventactions`**, **`eventitems`** — nombres de eventos que publico desde el agente.
- Opcional **`intentsearch`** si querés un intent solo para búsqueda.

En **`eventItems`** suelo mandar **`items`**, **`totalItems`**, **`page`**, **`pageSize`**. Sin runtime válido en **`globalThis`**, los intents no llegan a ningún lado.

## Buscador (comportamiento del kit)

Configurable con **`AbeyTableElement.searchDebounceMs`**. También ejecuta pendiente al salir del campo, clic fuera (pierde “sticky focus”) y **Enter** si quedaba un disparo aplazado. Detalle en **`packages/uikit/src/table/abey-table.ts`**.

## Docs del monorepo que apoyan esto

- **`docs/abey-table.md`** — runtime en **`globalThis`**, uso TS básico.
- **`docs/abey-table-flows.md`** — ejemplos de payloads.

En conjunto: el HTML de la página es la guía visual; este README es el **historial mental** del mismo ejemplo para quien lo lee desde el IDE.
