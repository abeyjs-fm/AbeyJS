# CRUD automático en AbeyJs — Características y estado

Este documento recoge la **definición de producto** hacia un CRUD automático (modelo → UI + lógica + API) y, para cada punto, el **estado en el monorepo hoy** (sí / parcial / no). La sección 0 de [visión de producto](vision-abeyjs.md) resume el posicionamiento frente al “CRUD a mano”.

**Definición de meta:** *CRUD automático real* = generar (o ensamblar) **UI + lógica de sincronía + conexión API + estado reactivo** a partir de **una** fuente de verdad (modelo / spec), con personalización progresiva.

> El DSL de ejemplo *(`model Cliente` / `connect` / `view … auto`)* al final de este documento **no existe como sintaxis** hoy: es el **norte**; el enfoque actual pasa por **OpenAPI** + registro con `@abeyjs/openapi` y vistas en `@abeyjs/view`.

**Nota:** formularios de **documento de venta** (cabecera + `items[]` + `pagos[]` desde una interfaz TS / meta propia, p. ej. `examples/MyMiusic/.../invoice`) **no** pasan por este pipeline; usan `<abey-form>` + `InvoiceDocumentFormMeta`. Ver `examples/MyMiusic/src/ecosystems/invoice/README.md`.

---

| # | Característica | Estado | Notas en el monorepo |
| --- | --- | --- | --- |
| 1 | **Modelo declarativo (model-first):** una descripción de entidad → UI, validación y lógica coherente. | **Parcial** | La fuente hoy es **OpenAPI/JSON Schema** → `ListViewDef` + `FormViewDef` + Zod en [discover-crud](../packages/openapi/src/discover-crud.ts). No hay un lenguaje propio de modelo aparte del spec. |
| 2 | **Conexión automática a API (REST, p. ej. .NET):** GET/POST/PUT/PATCH/DELETE mapeados sin reescribir `fetch` a mano. | **Parcial** | `DynamicCrudAgent` + `createOmegaHttp` hacen el circuito a partir de rutas descubiertas; tú aportas **spec + baseUrl/proxy** (CORS, env). `OmegaHttp` centraliza trazas y métodos. |
| 3 | **Generación automática de UI:** tabla + formulario + acciones sin “construir” a mano cada pixel. | **Parcial** | `mountListViewSync` / `mountFormView` consumen `listView` / `formView` del **agente**; [crud-app](../examples/crud-app) **ensambla** aún con código imperativo. Falta un único *mount* “pantalla CRUD completa” o plantilla cero-boilerplate. |
| 4 | **Reactividad granular** (solo cambia fila/celda afectada). | **Sí (lista)** | `mountListViewSync` + `rowKey` + `mergeListRowsByKey` + batching por `requestAnimationFrame` ([mount-list-sync](../packages/view/src/dom/mount-list-sync.ts)). |
| 5 | **Store automático** (estado interno, sync datos ↔ UI). | **Parcial** | `StateCell` + `DynamicCrudViewState` en el agente OpenAPI; no es un “data store” genérico con nombre aparte, pero el patrón está. |
| 6 | **Validaciones unificadas** (una definición, frontend alineable con contrato; backend con tu stack). | **Parcial** | Zod inferido del schema en cliente; [validación](../packages/validation) y *codegen* para tipos. **Backend** valida con .NET, etc. — [fuera de AbeyJs](vision-abeyjs.md#1-matriz-requisito--código-paquetes). |
| 7 | **Acciones declarativas** (editar / eliminar vía intención, no solo funciones sueltas de UI). | **Parcial** | Intents `Entidad/List`, `Create`, `…/Update`, `…/Delete` desde [register](../packages/openapi/src/register.ts). Los **botones** aún se enlazan en app con `mountIntentButton` o similar. |
| 8 | **Tipos de campo inteligentes** (string → input, email, boolean, date, status, progress…). | **Parcial** | Descubrimiento: `text`, `number`, `email`, `readonly` ([schemaToViewFields](../packages/openapi/src/discover-crud.ts)). **No** mapea aún a checkbox/date/badge/progress de forma rica; extensible en `ViewField` + `mountFormView`. |
| 9 | **Convención sobre configuración** (endpoints y nombres alineados → poca config extra). | **Parcial** | La **convención** es: **OpenAPI fidedigno** (colección + opcional `/{id}`) → descubrimiento. No un conjunto fijo de URLs sin spec. |
| 10 | **Personalización progresiva** (automático → declarativo → manual DOM). | **Sí (dirección)** | Documentado en [visión](vision-abeyjs.md) y [seguridad](security-abeyjs.md): híbrido y HTML propio; el modo “cero líneas” de UI aún no está cerrado. |
| 11 | **Seguridad por defecto (XSS)**. | **Sí** | `textContent` / escape en `{{}}`, `setSanitizedHtml` y política en [security-abeyjs](security-abeyjs.md). |
| 12 | **Estilos integrados** (omega, variables, poco invasivo). | **Sí** | [omega-default.css](../packages/view/theme/omega-default.css), variables `--abey-*`. |
| 13 | **Sincronía tras crear/editar/borrar** (sin recarga completa). | **Parcial** | El **agente** actualiza `list` / `form` en el estado; la UI suscrita se entera. Detalle “siempre al día con el servidor” depende de volver a listar o de fusionar filas. |
| 14 | **Optimización automática** (batch, render parcial, caché). | **Parcial** | Batching/merge de filas en listas; **caché “inteligente”** a nivel de app no es el foco aún. |
| 15 | **Enfoque a negocio** (entidades, no primitivos de UI). | **Parcial** | Nombres de intención/entidad desde paths (`entityPascal`); el dev sigue viendo `mount*` donde monte pantallas. |

---

## Comando: cablear otra app como *mislibros*

Desde la raíz del monorepo, con el CLI ya compilado (`npm run build -w @abeyjs/cli`):

```bash
node packages/cli/dist/cli.js add openapi <carpeta-del-proyecto> [--proxy <https://host:puerto>] [--openapi-path /ruta/del.json]
```

Por defecto: `--proxy https://127.0.0.1:7019` y `--openapi-path /swagger/v1/swagger.json` (Vite hace de proxy a `/api` y `/swagger`). Luego: `cd` al proyecto, `npm i`, copiá `.env.example` a `.env`, levantá Kestrel y prueba la ruta **/crud-api**.

---

## Síntesis

- **Fuerte hoy:** contrato con **OpenAPI** → **descubrimiento**, **agente + intents**, **Zod** + **definiciones de lista/form**, **listas reactivas por clave** y **tema/seguridad** documentados.
- **Hueco hacia el “sólo el modelo y listo”:** un **ensamblaje de UI** que no exija replicar el [main del crud-app](../examples/crud-app/src/main.ts) a mano; **mapeo de tipos** más rico; y opcionalmente un **DSL o scaffold** hacia el ejemplo final de abajo.

## Ejemplo de sintaxis (meta; no implementado)

```text
model Cliente
connect Cliente "/api/clientes"
view Clientes auto
```

*Resultado deseado:* CRUD con UI, validación, sync y buen rendimiento, generados o conectados desde el modelo o el spec. Hoy, el análogo práctico es: **espec OpenAPI** + `registerOpenApiCrud` / `registerOpenApiAllCrud` + montaje de vistas en TypeScript o HTML declarativo.

---

*Última alineación con el código: revisar las rutas a los paquetes citados en cada release.*
