import { intentOf } from "@abeyjs/core";
import type { OmegaRuntime } from "@abeyjs/runtime";
import type { StateCell } from "@abeyjs/state";
import {
  mountBoundText,
  mountFormView,
  mountIntentButton,
  mountListViewSync,
  mountTracePanel,
} from "@abeyjs/view";
import type { DiscoveredCrud } from "./discover-crud.js";
import type { DynamicCrudAgent, DynamicCrudViewState } from "./dynamic-crud-agent.js";

/**
 * Mounts a reactive **list** + **form** + optional **toolbar**, **flow message**, and **`mountTracePanel`** HTTP trace strip
 * wired to an already **`registerOpenApi*`** **`DynamicCrudAgent`** (`root` emptied and receives `abey-openapi-crud`).
 */
export function mountOpenApiCrudView(o: {
  root: HTMLElement;
  discovered: DiscoveredCrud;
  agent: DynamicCrudAgent;
  runtime: OmegaRuntime;
  listIntent: string;
  createIntent: string;
  updateIntent?: string;
  deleteIntent?: string;
  showToolbar?: boolean;
  showTrace?: boolean;
  showFlowMessage?: boolean;
}): { dispose: () => void } {
  const { root, discovered, agent, runtime, listIntent, createIntent, deleteIntent } = o;
  const viewCell = agent.viewState as unknown as StateCell<Record<string, unknown>>;
  const showToolbar = o.showToolbar !== false;
  const showTrace = o.showTrace !== false;
  const showFlow = o.showFlowMessage !== false;
  const deleteIntentId = deleteIntent;
  let formVisible = false;

  root.classList.add("abey-openapi-crud");
  root.textContent = "";
  const unsubs: (() => void)[] = [];

  if (showToolbar) {
    const toolbar = document.createElement("div");
    toolbar.className = "abey-toolbar";
    root.appendChild(toolbar);
    mountIntentButton(toolbar, runtime, "Listar", listIntent, undefined);
    const newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "abey-btn";
    newBtn.textContent = "Nuevo";
    newBtn.addEventListener("click", () => {
      formVisible = true;
      agent.cancelEdit();
      refreshLayoutVisibility();
    });
    toolbar.appendChild(newBtn);
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "abey-btn";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", () => {
      formVisible = false;
      refreshLayoutVisibility();
    });
    toolbar.appendChild(cancelBtn);
  }

  if (showFlow) {
    const flowHost = document.createElement("section");
    flowHost.setAttribute("aria-label", "Flujo API");
    flowHost.className = "abey-hero";
    root.appendChild(flowHost);
    unsubs.push(
      mountBoundText(
        flowHost,
        viewCell,
        (s) => (s as DynamicCrudViewState).flowMessage || "Sin tráfico: usa Listar o acciones de fila.",
        { as: "pre" },
      ),
    );
  }

  const listHost = document.createElement("div");
  listHost.className = "abey-openapi-crud__list";
  root.appendChild(listHost);
  const hr1 = document.createElement("hr");
  hr1.className = "abey-divider";
  root.appendChild(hr1);
  const formHost = document.createElement("div");
  formHost.className = "abey-openapi-crud__form";
  root.appendChild(formHost);
  const hr2 = document.createElement("hr");
  hr2.className = "abey-divider";
  root.appendChild(hr2);
  const traceHost = document.createElement("div");
  traceHost.className = "abey-openapi-crud__trace";
  root.appendChild(traceHost);
  if (showTrace) {
    const trace = mountTracePanel(traceHost, runtime);
    unsubs.push(
      runtime.channel.onAll(() => {
        trace.refresh();
      }),
    );
  } else {
    traceHost.textContent = "";
  }

  function refreshLayoutVisibility(): void {
    formHost.style.display = formVisible ? "" : "none";
    hr2.style.display = formVisible ? "" : "none";
    listHost.style.display = formVisible ? "none" : "";
    hr1.style.display = formVisible ? "none" : "";
  }

  const listRowActions: { label: string; onClick: (row: Record<string, unknown>) => void }[] = [
    {
      label: "Editar",
      onClick: (row) => {
        formVisible = true;
        agent.beginEdit(row);
        refreshLayoutVisibility();
      },
    },
  ];
  if (deleteIntentId) {
    const del = deleteIntentId;
    listRowActions.push({
      label: "Eliminar",
      onClick: (row) => {
        void runtime.dispatch(intentOf(del, row), { source: "list" });
      },
    });
  }

  unsubs.push(
    mountListViewSync(
      listHost,
      discovered.listView,
      viewCell,
      (s) => (s as DynamicCrudViewState).list,
      {
        rowActions: listRowActions,
        onPageChange: (page: number, pageSize: number) => {
          void agent.loadListPage(page, pageSize);
        },
      } as any,
    ),
  );

  unsubs.push(
    mountFormView(
      formHost,
      discovered.formView,
      viewCell,
      {
        getForm: (s) => (s as DynamicCrudViewState).form,
        onValid: (v, r) => {
          void r.dispatch(intentOf(createIntent, v), { source: "form" });
        },
        onValidationFieldErrors: (_s, m) => {
          agent.setFormFieldErrors(m);
        },
        resolveSelectOptions: (opts) => agent.fetchLookupOptions(opts),
        runtime,
      },
    ),
  );

  unsubs.push(
    agent.viewState.subscribe(() => {
      const vs = agent.viewState.get() as unknown as DynamicCrudViewState;
      if (formVisible && vs.form.mode === "create" && vs.form.status === "success") {
        formVisible = false;
        refreshLayoutVisibility();
      }
    }),
  );

  // Initial layout: list only; form reveals via toolbar / row actions.
  refreshLayoutVisibility();

  return {
    dispose: () => {
      for (const u of unsubs) u();
      root.textContent = "";
    },
  };
}
