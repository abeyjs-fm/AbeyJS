import type { DiscoveredCrud } from "./discover-crud.js";

/**
 * Fragmento de {@link DiscoveredCrud} que las vistas CRUD generadas fusionan para
 * paginación de lista y operaciones de ítem (rutas/métodos/ids).
 */
export type OpenApiCrudListBehaviorOverrides = Partial<
  Pick<
    DiscoveredCrud,
    | "listDataPath"
    | "listTotalPath"
    | "listPagePath"
    | "listPageSizePath"
    | "listTotalPagesPath"
    | "listPageParam"
    | "listPageSizeParam"
    | "listPageBase"
    | "itemPathTemplate"
    | "itemPathParamName"
    | "updateMethod"
    | "deleteMethod"
    | "deletePathTemplate"
    | "itemIdSource"
    | "itemIdField"
    | "hasItemDelete"
  >
>;
