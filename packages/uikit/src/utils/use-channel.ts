import { AbeyFormElement } from "../form/abey-form-impl.js";
import { FormSlice } from "../form/form-types.js";
import { AbeyTableElement } from "../table/abey-table.js";

/**
 * INTERFAZ PURA: Solo la esencia de la Tabla.
 */
export interface TableChannel<T> {
  items: T[];
  columns: any[];
  actions: any[];
  page: number;
  pageSize: number;
  totalItems: number | null;
  loadNetwork: boolean;
  readonly selectedIds: ReadonlySet<string>;
  clearSelection(): void;
  onEdit(handler: (row: T) => void): void;
  onDelete(handler: (row: T) => void): void;
  onSelect(handler: (selected: T[]) => void): void;
  onSearch(handler: (query: string) => void): void;
}

/**
 * INTERFAZ PURA: Solo la esencia del Formulario.
 */
export interface FormChannel<T = any> {
  // Propiedades de Estado
  config: any; // Para cambiar la configuración dinámicamente
  formSlice: FormSlice; // Para hidratar el form o ponerlo en modo error/carga

  // Gestión de Datos (Store)
  getStoreValue(path?: string): unknown;
  setStoreValue(path: string, value: unknown): void;
  // Eventos Mágicos
  onSubmit(handler: (values: T) => void): void;
  onInvalid(handler: () => void): void;
  onStoreChange(handler: (path: string, value: any) => void): void;
}

export function useChannel<T>(host: any, role: string): T {
  let cached: HTMLElement | null = null;

  const resolve = () => {
    if (cached?.isConnected) return cached;
    // Buscamos el elemento por su data-role
    const el = (host.elByRole?.(role) ??
      (host.shadowRoot ?? host).querySelector(
        `[data-role="${role}"]`,
      )) as HTMLElement | null;
    if (el) {
      cached = el;
      // Trigger lazy registration if not already defined
       const tag = el.tagName.toLowerCase();
      if (tag === "abey-table") AbeyTableElement.define("abey-table");
      else if (tag === "abey-form") AbeyFormElement.define("abey-form");
    }
    return cached;
  };

  const internalListen = (type: string, handler: any) => {
    const el = resolve();
    if (!el) return;
    el.addEventListener(type, handler);
    if (typeof host.onDestroy === "function") {
      host.onDestroy(() => el.removeEventListener(type, handler));
    }
  };

  return new Proxy({} as any, {
    get(_, prop) {
      const propName = String(prop);
      if (propName === "listen") return internalListen;

      if (propName.startsWith("on") && propName.length > 2) {
        const name = propName.slice(2).toLowerCase();
        return (handler: any) => {
          const el = resolve();
          const tag = el?.tagName ?? "";

          if (tag.includes("TABLE")) {
            if (name === "select")
              return internalListen("selectionchange", (ev: any) =>
                handler(ev.detail?.selectedItems),
              );
            return internalListen("action", (ev: any) => {
              if (ev.detail?.actionId === name) handler(ev.detail.row);
            });
          }

          if (tag.includes("FORM")) {
            if (name === "submit")
              return internalListen("abeyformsubmit", (ev: any) =>
                handler(ev.detail?.values),
              );
            if (name === "invalid")
              return internalListen("abeyforminvalid", handler);
          }

          return internalListen(name, handler);
        };
      }

      const el = resolve();
      if (!el) return undefined;

      const value = (el as any)[prop];
      if (typeof value === "function") return value.bind(el);

      // Si es un componente Abey y aún no se ha "mejorado" (upgraded), 
      // devolvemos una función diferida que se ejecutará cuando esté listo.
      const tag = el.tagName.toLowerCase();
      if (tag === "abey-table" || tag === "abey-form") {
        return (...args: any[]) => {
          customElements.whenDefined(tag).then(() => {
            const upgradedEl = el as any;
            if (typeof upgradedEl[prop] === "function") {
              upgradedEl[prop](...args);
            }
          });
        };
      }

      return value;
    },
    set(_, prop, value) {
      const el = resolve();
      if (el) {
        (el as any)[prop] = value;
        return true;
      }
      return false;
    },
  }) as T;
}
