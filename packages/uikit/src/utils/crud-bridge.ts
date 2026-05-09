export interface CrudBridgeOptions {
  host: any;
  channel: any;
  table?: any;
  form?: any;
  events: {
    changed: string;
    invalid: string;
  };
  /** Extract items array from the changed event payload. */
  itemsKey?: string;
  /** Callback when data changes (e.g. to update stats). */
  onChanged?: (data: any) => void;
  /** Callback for custom banner updates. */
  updateBanner?: (msg: string, tone: "idle" | "ok" | "err") => void;
}

/**
 * Standard wiring for CRUD components:
 * - Listens for 'changed' event to update table items and reset form.
 * - Listens for 'invalid' event to show validation errors in form and banner.
 */
export function wireCrudBridge(options: CrudBridgeOptions) {
  const { host, channel, table, form, events, itemsKey = "items", onChanged, updateBanner } = options;

  if (!channel?.on) return;

  host.onDestroy(
    channel.on(events.changed, (data: any) => {
      // 1. Update Table
      if (table) {
        const items = Array.isArray(data?.[itemsKey]) ? data[itemsKey] : [];
        table.items = items;
      }

      // 2. Custom callback (e.g. stats)
      onChanged?.(data);

      // 3. Banner
      updateBanner?.("Actualizado.", "ok");

      // 4. Reset Form to Create mode
      if (form) {
        // We assume the host has a way to reset its editing state
        if (typeof (host as any).resetEditing === "function") {
          (host as any).resetEditing();
        } else {
          // Fallback: just clear form slice
          form.formSlice = { value: {}, status: "idle", mode: "create" };
        }
      }
    })
  );

  host.onDestroy(
    channel.on(events.invalid, (payload: any) => {
      const message = String(payload?.message ?? "Error de validación");
      const fieldErrors = (payload?.fieldErrors ?? {}) as any;

      updateBanner?.(message, "err");

      if (form) {
        form.formSlice = {
          ...form.formSlice,
          status: "error",
          fieldErrors,
        };
      }
    })
  );
}
