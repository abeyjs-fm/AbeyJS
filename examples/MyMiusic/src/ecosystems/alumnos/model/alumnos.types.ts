import { fieldErrorsToMap, safeParseWithErrors } from "@abeyjs/validation";
import {
  classToSchema,
  Checkbox,
  Checked,
  Email,
  FormFieldKind,
  FormModel,
  Hidden,
  Label,
  Optional,
  PrimaryKey,
  RadioStatic,
  Required,
  SelectApi,
  SelectStatic,
} from "@abeyjs/uikit";
import type { SelectApiOptions } from "@abeyjs/uikit";

@FormModel({ title: "Alumno" })
export class AlumnoEntity {
  @Label("Nombres")
  @Required("Nombres obligatorios (mínimo 2 caracteres)")
  nombres!: string;

  @Label("Email")
  @Email()
  @Required("El correo es obligatorio")
  email!: string;

  @Label("Edad")
  @FormFieldKind("number")
  @Required("Edad obligatoria (número de 1 a 120)")
  edad!: number;

  @Label("Grado")
  @Required("Grado obligatorio")
  grado!: string;

  @Label("Artista favorito")
  @SelectStatic([
    { value: "taylor", label: "Taylor Swift" },
    { value: "badbunny", label: "Bad Bunny" },
    { value: "shakira", label: "Shakira" },
  ])
  @Optional()
  artistaFavoritoId?: string;

  @Label("Género")
  @SelectApi({ endpoint: "/genre", valueField: "id", labelField: "name", dataPath: "data" } satisfies SelectApiOptions)
  @Optional()
  generoId?: string;

  @Label("Turno")
  @RadioStatic([
    { value: "manana", label: "Mañana" },
    { value: "tarde", label: "Tarde" },
  ])
  @Required("Elegí un turno")
  turno!: string;

  @Label("Acepta términos")
  @Checkbox()
  @Checked("Debés aceptar los términos")
  aceptaTerminos!: boolean;

  /** Parte de la entidad/API, pero no se muestra en el formulario. */
  @Hidden()
  @PrimaryKey()
  @Optional()
  id?: string;
}

export type Alumno = Omit<InstanceType<typeof AlumnoEntity>, "id"> & { id: string };

export type AlumnosInvalidPayload = {
  message: string;
  fieldErrors: Partial<Record<keyof Alumno, string>>;
};

export function sampleAlumnos(): Alumno[] {
  return [
    {
      id: "a-1001",
      nombres: "María López",
      email: "maria@example.com",
      edad: 16,
      grado: "4°",
      artistaFavoritoId: "taylor",
      generoId: "",
      turno: "manana",
      aceptaTerminos: true,
    },
    {
      id: "a-1002",
      nombres: "Juan Pérez",
      email: "juan@example.com",
      edad: 17,
      grado: "5°",
      artistaFavoritoId: "badbunny",
      generoId: "",
      turno: "tarde",
      aceptaTerminos: true,
    },
    {
      id: "a-1003",
      nombres: "Lucía Ramos",
      email: "lucia@example.com",
      edad: 15,
      grado: "3°",
      artistaFavoritoId: "shakira",
      generoId: "",
      turno: "manana",
      aceptaTerminos: true,
    },
  ];
}

const AlumnoSchema = classToSchema(AlumnoEntity as any);

export function validateAlumno(input: unknown): AlumnosInvalidPayload | null {
  const p = safeParseWithErrors(AlumnoSchema, input);
  if (p.success) return null;
  const fe = fieldErrorsToMap(p.fields);
  const detail = Object.values(fe)
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .join(" · ");
  return { message: detail || "Revisá los campos", fieldErrors: fe as any };
}

export function normalizeAlumno(input: Partial<Alumno>): Alumno {
  return {
    id: String((input as any)?.id ?? "").trim(),
    nombres: String(input.nombres ?? "").trim(),
    email: String(input.email ?? "").trim(),
    edad: Number.isFinite(Number(input.edad)) ? Number(input.edad) : 0,
    grado: String(input.grado ?? "").trim(),
    artistaFavoritoId: (input as any)?.artistaFavoritoId ? String((input as any).artistaFavoritoId).trim() : undefined,
    generoId: (input as any)?.generoId ? String((input as any).generoId).trim() : undefined,
    turno: String((input as any)?.turno ?? "").trim(),
    aceptaTerminos: Boolean((input as any)?.aceptaTerminos),
  };
}

export function newAlumnoId(now = Date.now()): string {
  return `a-${now}`;
}

