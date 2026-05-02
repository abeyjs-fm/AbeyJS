/**
 * **`@abeyjs/openapi`** — discover REST-ish collections from OpenAPI JSON, register **`DynamicCrudAgent`** + intents on
 * **`OmegaRuntime`**, and optionally **`mountOpenApiCrudView`** for a bundled list/form/trace UI.
 *
 * Codegen / connect workflow: **`@abeyjs/cli`** (`abeyjs connect`, `abeyjs generate views`). Full narrative in **`README.md`**.
 */
export { discoverAllCrud, discoverFirstCrud, type DiscoveredCrud } from "./discover-crud.js";
export type { OpenApiCrudListBehaviorOverrides } from "./crud-view-config-types.js";
export { type DynamicCrudViewState, DynamicCrudAgent, type OpenApiRow } from "./dynamic-crud-agent.js";
export {
  registerOpenApiAllCrud,
  registerOpenApiCrud,
  registerWithDiscovered,
  type OpenApiMultiRegisterOk,
  type OpenApiRegisterErr,
  type OpenApiRegisterOk,
} from "./register.js";
export { jsonObjectSchemaToZod, guessRowKeyFromSchema } from "./json-schema-to-zod.js";
export { mountOpenApiCrudView } from "./mount-openapi-crud-view.js";
