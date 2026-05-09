import { OmegaStatefulAgent, type OmegaAgentContext } from "@abeyjs/agents";
import type { OmegaAgentMessage } from "@abeyjs/agents";
import type { OmegaHttp } from "@abeyjs/http";
import { StudentsEcosystem } from "./semantics.js";
import type {
  Student,
  StudentsInvalidPayload,
} from "../model/students.types.js";
import {
  newStudentId,
  normalizeStudent,
  sampleStudents,
  validateStudent,
} from "../model/students.types.js";
import type { FieldSelectOptions } from "@abeyjs/uikit";

export type StudentsViewState = {
  students: Student[];
  lastChangeAt: number;
};

function removeById(items: Student[], id: string): Student[] {
  return items.filter((a) => a.id !== id);
}

function upsert(items: Student[], next: Student): Student[] {
  const idx = items.findIndex((a) => a.id === next.id);
  if (idx < 0) return [next, ...items];
  const copy = items.slice();
  copy[idx] = next;
  return copy;
}

export class StudentsAgent extends OmegaStatefulAgent<StudentsViewState> {
  #http: OmegaHttp;
  #genresCache: Array<{ value: string; label: string }> | null = null;

  constructor(ctx: OmegaAgentContext, deezerHttp: OmegaHttp) {
    super(ctx, { students: [], lastChangeAt: 0 });
    this.#http = deezerHttp;
  }

  override connect(): void {
    /* Sin suscripciones: intents llegan vía flow → receiveIntent */
  }

  protected override onAction(action: string, payload?: unknown): void {
    if (action === "init") {
      const students = sampleStudents();
      const next = { students, lastChangeAt: Date.now() };
      this.setViewState(next);
      this.emit(StudentsEcosystem.eventChanged, next);
      return;
    }

    if (action === "create") {
      const draft = normalizeStudent((payload ?? {}) as Partial<Student>);
      const invalid = validateStudent(draft);
      if (invalid) {
        this.emit(
          StudentsEcosystem.eventInvalid,
          invalid satisfies StudentsInvalidPayload,
        );
        return;
      }
      const Student: Student = {
        id: newStudentId(),
        nombres: draft.nombres,
        email: draft.email,
        edad: draft.edad,
        grado: draft.grado,
        artistaFavoritoId: (draft as any).artistaFavoritoId,
        generoId: (draft as any).generoId,
        turno: (draft as any).turno,
        aceptaTerminos: (draft as any).aceptaTerminos,
      };
      const next = {
        students: upsert(this.viewState.get().students, Student),
        lastChangeAt: Date.now(),
      };
      this.setViewState(next);
      this.emit(StudentsEcosystem.eventChanged, next);
      return;
    }

    if (action === "update") {
      const draft = normalizeStudent((payload ?? {}) as Partial<Student>);
      if (!draft.id) {
        this.emit(StudentsEcosystem.eventInvalid, {
          message: "Falta id para actualizar",
          fieldErrors: { id: "Id obligatorio" },
        } satisfies StudentsInvalidPayload);
        return;
      }
      const invalid = validateStudent(draft);
      if (invalid) {
        this.emit(
          StudentsEcosystem.eventInvalid,
          invalid satisfies StudentsInvalidPayload,
        );
        return;
      }
      const Student: Student = {
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
      const next = {
        students: upsert(this.viewState.get().students, Student),
        lastChangeAt: Date.now(),
      };
      this.setViewState(next);
      this.emit(StudentsEcosystem.eventChanged, next);
      return;
    }

    if (action === "delete") {
      const id =
        typeof payload === "string"
          ? payload
          : String((payload as any)?.id ?? "").trim();
      if (!id) return;
      const next = {
        students: removeById(this.viewState.get().students, id),
        lastChangeAt: Date.now(),
      };
      this.setViewState(next);
      this.emit(StudentsEcosystem.eventChanged, next);
      return;
    }

    if (action === "loadGenres") {
      const requestId = String((payload as any)?.requestId ?? "").trim();
      if (!requestId) return;
      const select = ((payload as any)?.select ??
        null) as FieldSelectOptions | null;
      const endpoint = String(select?.endpoint ?? "/genre").trim() || "/genre";
      const method = String((select as any)?.method ?? "GET").toUpperCase() as
        | "GET"
        | "POST";
      const body = (select as any)?.body;
      const valueField = String(select?.valueField ?? "id").trim() || "id";
      const labelField = String(select?.labelField ?? "name").trim() || "name";
      const dataPath = String(select?.dataPath ?? "data").trim() || "data";

      if (endpoint === "/genre" && method === "GET" && this.#genresCache) {
        this.emit(StudentsEcosystem.eventGenres, {
          requestId,
          items: this.#genresCache,
        });
        return;
      }

      const getByPath = (obj: any, path: string): any => {
        const segs = path
          .split(".")
          .map((s) => s.trim())
          .filter(Boolean);
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
            .map((g: any) => ({
              value: String(g?.[valueField] ?? "").trim(),
              label: String(g?.[labelField] ?? "").trim(),
            }))
            .filter((it: any) => it.value && it.label);
          if (endpoint === "/genre" && method === "GET")
            this.#genresCache = items;
          this.emit(StudentsEcosystem.eventGenres, { requestId, items });
        } catch (err) {
          this.emit(StudentsEcosystem.eventGenres, {
            requestId,
            items: [],
            error: String(err ?? "error"),
          });
        }
      })();
      return;
    }
  }

  protected override onMessage(_msg: OmegaAgentMessage): void {}
}
