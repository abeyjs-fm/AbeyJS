# Visión AbeyJs: núcleo, brechas y soporte HTML/CSS

Este documento fija el contrato de producto frente al monorepo: qué ya existe, qué queda acotado y cómo usar HTML y CSS con seguridad y convención.

---

## 0. Diferenciación: CRUD “real” sin repetir el teatro

En el enfoque habitual (lib de UI, SPA genérica, o a mano), **tú** vuelves a implementar, por entidad, la misma trama: tabla con columnas, formulario, botones, validación en cliente, estados de carga y error, y encaje con el contrato de la API. Cada capa añade líneas, **código repetitivo** y superficie de **error** (drift con el backend, acciones rotas, columnas desalineadas con el DTO).

**AbeyJs apunta a otro criterio de producto:** a partir de un **OpenAPI** (contrato fidedigno y, hoy, descubrimiento y registro con `@abeyjs/openapi`), el runtime **genera o ensambla** el circuito de **listar / crear / (según el spec) leer, actualizar y borrar** —intents, agente, vistas reactivas— de modo que no reescribas cientos de formularios y acciones a la antigua. Sigue existiendo híbrido: montes lo que quieras a mano, pero el **diferenciador** que persigue el proyecto es **crud productivo con menos ruido y una sola fuente de verdad: el spec**.

Código de referencia: [register.ts](../packages/openapi/src/register.ts) · [discover-crud](../packages/openapi/src/discover-crud.ts) · ejemplo [examples/crud-app](../examples/crud-app). Lista de características deseadas (1–15) y estado: [crud-automatico-abeyjs](crud-automatico-abeyjs.md).

---

## 1. Matriz requisito / código (paquetes)

| Requisito (visión) | Cobertura | Ubicación / notas |
| --- | --- | --- |
| Modelo reactivo (UI desde datos) | Sí (celda observable) | `StateCell` en `@abeyjs/core` |
| Sin manejo manual de estado a nivel de app (opcional) | Parcial: agentes y vistas se suscriben a celdas | Aplicación decide cuánta lógica queda en vistas |
| Reactividad granular, render parcial | Sí (tablas) | `mountListViewSync` actualiza celdas `Text` y filas por clave, con batch por `requestAnimationFrame` |
| CRUD automático (OpenAPI) | **Parcial → completo** | `@abeyjs/openapi`: registro con listado (GET) y alta (POST); filas bajo `/{id}` añaden lectura, PUT/PATCH, DELETE y intents `…/Update`, `…/Delete` según el spec. Ver [discover-crud](../packages/openapi/src/discover-crud.ts) y [register](../packages/openapi/src/register.ts) |
| Generación desde OpenAPI (tipos) | Sí | `abeyjs codegen` en `@abeyjs/cli` → `api-types.ts` y stub de setup |
| Validación en cliente alineable con Zod | Sí | `@abeyjs/validation` + esquemas generados o inferidos del JSON Schema |
| Validación backend | Fuera de AbeyJs | Reutilizar el mismo `zod` o contrato OpenAPI; el servicio valida con su stack (.NET, etc.) |
| Conexión HTTP REST (incl. .NET) | Sí (HTTP genérico) | `createOmegaHttp` en `@abeyjs/http`: mismo contrato con cualquier origen CORS+JSON |
| Carga y errores en listas/formularios de agente | Sí | Slices `loading` / `error` en vista del agente OpenAPI |
| Modo “automático” (poca UI a mano) | Parcial | `PageViewSpec`, `pageRoute`, `mountFormView` / `mountListView*`, agente OpenAPI |
| Modo híbrido (DOM propio + binding) | Sí | Cualquier `mount` en rutas; `StateCell` + `mount*View` en fragmentos del DOM |
| Modo avanzado (control total) | Sí | DOM API o HTML estático; sin obligación de componentes de AbeyJs |
| Extensión / plugins | Sí (API mínima) | `OmegaRuntime.registerPlugin` en `@abeyjs/core` (instalación + teardown) |
| Motor interno: tracking por clave, batch | Sí en listas | `rowKey` + `mergeListRowsByKey` + reconciliación por fila |
| Seguridad (XSS) | Sí (por diseño) | `textContent` y APIs declarativas; [política completa](security-abeyjs.md) con `escapeHtml`, `bindText` (`{{}}` seguro), `AbeyJs.sanitize` / `setSanitizedHtml` (`abey-html`) |
| Escala (CRM/ERP) | Producto/ops | Requiere carga paginada, caché, etc. — no todo está en el núcleo |

**Brecha histórica (documentada y cerrada vía spec):** la primera versión de descubrimiento exigía GET+POST al mismo path sin `/{id}`. El descubrimiento ahora acepta el par ruta de **colección** y ruta de **ítem** (`…/{id}`) cuando el OpenAPI lo define, y el registro en bloque (multi-entidad) itera múltiples pares de rutas en el spec.

---

## 2. Política de HTML: DOM por defecto, riesgo explícito con cadenas

- **Resumen de reglas:** [Seguridad AbeyJs](security-abeyjs.md) (texto por defecto, `{{}}` con escape, sin `innerHTML` automático, `abey-html` + `AbeyJs.sanitize()` / `setSanitizedHtml` para lo dinámico, validación también en backend).
- **Recomendado (AbeyJs “por defecto”):** `document.createElement` + `textContent`; las APIs declarativas de `@abeyjs/view` no inyectan HTML crudo.
- **HTML estático** en `index.html` (Vite) y montar en contenedores es seguro; el riesgo entra solo con scripts o con datos reinyectados sin tratar.
- **HTML dinámico (híbrido/rico):** pasar por `setSanitizedHtml` o, manualmente, por `AbeyJs.sanitize` / `escapeHtml` antes de tocar el DOM. Para allowlist de etiquetas, `configureSanitize` con p. ej. DOMPurify. En modo avanzado, el DOM es tuyo y el riesgo explícito.

---

## 3. Guía de CSS: tema `omega`, estilos propios y temas

- **Tema incluido:** `import "@abeyjs/view/theme/omega-default.css"`. Aporta variables de espaciado, color, tipografía y clases BEM bajo el prefijo `abey-` (shell, listas, formularios, botones, etc.).
- **Convivencia con tu CSS:** añade otras hojas en Vite, CSS modules, preprocesadores, Tailwind, u otros; el runtime no fija un bundler más allá de respetar la importación del CSS. Las clases `abey-*` y las tuyas componen por el orden y la especificidad.
- **Personalización progresiva:** 1) Variables CSS redefinidas bajo contenedor (p. ej. `class="abey abey--tema"`), 2) Override de clases puntuales con más especificidad, 3) Reemplazar bloques de layout reutilizando solo primitivos (`abey-app`, contenedores).
- **Tema claro/oscuro:** hoy se puede activar añadiendo a la raíz (p. ej. `abey` + `abey--dark` si aplica) y asegurando que las variables `--abey-bg`, `--abey-text` y bordes estén redefinidas. La plantilla mínima es: una clase conmutada en el `<html>` o `<body>` y las variables del tema; consulta los bloques bajo ` .abey.abey--dark` en `omega-default.css`.

---

## 4. `registerOpenApiCrud` y multi-entidad

- **`registerOpenApiCrud`:** un agente bajo un par de rutas descubiertas: colección (GET+POST) y, si el spec añade `…/{param}` (un solo segmento) con al menos un método entre get/put/patch/delete, se rellenan `itemPathTemplate`, `itemPathParamName`, `updateMethod` y `hasItemDelete` en [DiscoveredCrud](../packages/openapi/src/discover-crud.ts). Intents: `…/List`, `…/Create` y, si aplica, `…/Update`, `…/Delete`.
- **`registerWithDiscovered`:** registro cuando ya tienes un `DiscoveredCrud` (p. ej. de `discoverAllCrud` filtrado a mano).
- **`registerOpenApiAllCrud`:** itera [discoverAllCrud](../packages/openapi/src/discover-crud.ts) y devuelve `items: OpenApiRegisterOk[]` (un agente por ruta de colección). Cada `entityPascal` se deriva de **todos** los segmentos del path (p. ej. `/api/products` → `ApiProducts`) para reducir colisiones de nombres de intent.
- **HTTP:** `putJson`, `patchJson`, `deletePath` en [client.ts](../packages/http/src/client.ts) alineados con el agente.

---

## 5. Plugins (extensiones al runtime)

- API: [OmegaPlugin](../packages/runtime/src/runtime.ts) y `runtime.registerPlugin({ id, install: (r) => teardown? })` / `unregisterPlugin(id)`.
- `install` puede apoyarse en `runtime.onIntent` o en `channel` sin forzar un árbol de componentes. `disposeAll()` del runtime también intenta bajar los teardown de plugins registrados.

---

## 6. Referencia rápida a paquetes

| Paquete | Rol |
| --- | --- |
| `@abeyjs/core` | Runtime, intención, canales, agente base, `StateCell` |
| `@abeyjs/view` | Vistas de datos, shell de rutas, listas reactivas, formularios |
| `@abeyjs/http` | `fetch` trazable |
| `@abeyjs/validation` | `zod` y helpers de errores por campo |
| `@abeyjs/openapi` | Descubrimiento OpenAPI, agente CRUD, registro |
| `@abeyjs/cli` | `codegen` e `init` de proyectos |

Para más detalle de uso: README en la raíz del monorepo y bajo [examples/](../examples/).
