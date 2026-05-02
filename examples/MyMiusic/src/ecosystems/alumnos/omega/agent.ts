import { OmegaStatefulAgent, type OmegaAgentContext } from "@abeyjs/agents";
import type { OmegaAgentMessage } from "@abeyjs/agents";
import type { OmegaHttp } from "@abeyjs/http";
import { AlumnosEcosystem } from "./semantics.js";
import type { Alumno, AlumnosInvalidPayload } from "../model/alumnos.types.js";
import { newAlumnoId, normalizeAlumno, sampleAlumnos, validateAlumno } from "../model/alumnos.types.js";
import type { FieldSelectOptions } from "@abeyjs/uikit";

export type AlumnosViewState = {
  alumnos: Alumno[];
  lastChangeAt: number;
};

function removeById(items: Alumno[], id: string): Alumno[] {
  return items.filter((a) => a.id !== id);
}

function upsert(items: Alumno[], next: Alumno): Alumno[] {
  const idx = items.findIndex((a) => a.id === next.id);
  if (idx < 0) return [next, ...items];
  const copy = items.slice();
  copy[idx] = next;
  return copy;
}

export class AlumnosAgent extends OmegaStatefulAgent<AlumnosViewState> {
  #http: OmegaHttp;
  #genresCache: Array<{ value: string; label: string }> | null = null;

  constructor(ctx: OmegaAgentContext, deezerHttp: OmegaHttp) {
    super(ctx, { alumnos: [], lastChangeAt: 0 });
    this.#http = deezerHttp;
  }

  override connect(): void {
    /* Sin suscripciones: intents llegan vía flow → receiveIntent */
  }

  protected override onAction(action: string, payload?: unknown): void {
    if (action === "init") {
      const alumnos = sampleAlumnos();
      const next = { alumnos, lastChangeAt: Date.now() };
      this.setViewState(next);
      this.emit(AlumnosEcosystem.eventChanged, next);
      return;
    }

    if (action === "create") {
      const draft = normalizeAlumno((payload ?? {}) as Partial<Alumno>);
      const invalid = validateAlumno(draft);
      if (invalid) {
        this.emit(AlumnosEcosystem.eventInvalid, invalid satisfies AlumnosInvalidPayload);
        return;
      }
      const alumno: Alumno = {
        id: newAlumnoId(),
        nombres: draft.nombres,
        email: draft.email,
        edad: draft.edad,
        grado: draft.grado,
        artistaFavoritoId: (draft as any).artistaFavoritoId,
        generoId: (draft as any).generoId,
        turno: (draft as any).turno,
        aceptaTerminos: (draft as any).aceptaTerminos,
      };
      const next = { alumnos: upsert(this.viewState.get().alumnos, alumno), lastChangeAt: Date.now() };
      this.setViewState(next);
      this.emit(AlumnosEcosystem.eventChanged, next);
      return;
    }

    if (action === "update") {
      const draft = normalizeAlumno((payload ?? {}) as Partial<Alumno>);
      if (!draft.id) {
        this.emit(AlumnosEcosystem.eventInvalid, {
          message: "Falta id para actualizar",
          fieldErrors: { id: "Id obligatorio" },
        } satisfies AlumnosInvalidPayload);
        return;
      }
      const invalid = validateAlumno(draft);
      if (invalid) {
        this.emit(AlumnosEcosystem.eventInvalid, invalid satisfies AlumnosInvalidPayload);
        return;
      }
      const alumno: Alumno = {
        id: draft.id,
        nombres: draft.nombres,
        email: draft.email,
        edad: draft.edad,
        grado: draft.grado,
        artistaFavoritoId: (draft as any).artistaFavoritoId,
        generoId: (draft as any).generoId,
        turno: (draft as any).turno,
        aceptaTerminos: (draft as any).aceptaTerminos,
      };
      const next = { alumnos: upsert(this.viewState.get().alumnos, alumno), lastChangeAt: Date.now() };
      this.setViewState(next);
      this.emit(AlumnosEcosystem.eventChanged, next);
      return;
    }

    if (action === "delete") {
      const id = typeof payload === "string" ? payload : String((payload as any)?.id ?? "").trim();
      if (!id) return;
      const next = { alumnos: removeById(this.viewState.get().alumnos, id), lastChangeAt: Date.now() };
      this.setViewState(next);
      this.emit(AlumnosEcosystem.eventChanged, next);
      return;
    }

    if (action === "loadGenres") {
      const requestId = String((payload as any)?.requestId ?? "").trim();
      if (!requestId) return;
      const select = ((payload as any)?.select ?? null) as FieldSelectOptions | null;
      const endpoint = String(select?.endpoint ?? "/genre").trim() || "/genre";
      const method = String((select as any)?.method ?? "GET").toUpperCase() as "GET" | "POST";
      const body = (select as any)?.body;
      const valueField = String(select?.valueField ?? "id").trim() || "id";
      const labelField = String(select?.labelField ?? "name").trim() || "name";
      const dataPath = String(select?.dataPath ?? "data").trim() || "data";

      if (endpoint === "/genre" && method === "GET" && this.#genresCache) {
        this.emit(AlumnosEcosystem.eventGenres, { requestId, items: this.#genresCache });
        return;
      }

      const getByPath = (obj: any, path: string): any => {
        const segs = path.split(".").map((s) => s.trim()).filter(Boolean);
        let cur: any = obj;
        for (const s of segs) {
          if (cur == null) return undefined;
          cur = cur[s];
        }
        return cur;
      };
      void (async () => {
        try {
          const res =
            method === "POST"
              ? await this.#http.postJson<any>(endpoint, body ?? {})
              : await this.#http.getJson<any>(endpoint);
          const listRaw = getByPath(res as any, dataPath);
          const list = Array.isArray(listRaw) ? listRaw : [];
          const items = list
            .map((g: any) => ({ value: String(g?.[valueField] ?? "").trim(), label: String(g?.[labelField] ?? "").trim() }))
            .filter((it: any) => it.value && it.label);
          if (endpoint === "/genre" && method === "GET") this.#genresCache = items;
          this.emit(AlumnosEcosystem.eventGenres, { requestId, items });
        } catch (err) {
          this.emit(AlumnosEcosystem.eventGenres, { requestId, items: [], error: String(err ?? "error") });
        }
      })();
      return;
    }
  }

  protected override onMessage(_msg: OmegaAgentMessage): void {}
}

