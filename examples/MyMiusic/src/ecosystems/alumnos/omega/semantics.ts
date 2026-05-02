export const AlumnosEcosystem = {
  agentId: "ecosystem:alumnos:agent",
  flowId: "ecosystem:alumnos:flow",

  intentInit: "Alumnos/Init",
  intentCreate: "Alumnos/Create",
  intentUpdate: "Alumnos/Update",
  intentDelete: "Alumnos/Delete",
  intentLoadGenres: "Alumnos/LoadGenres",

  eventChanged: "omega/ecosystem/alumnos/changed",
  eventInvalid: "omega/ecosystem/alumnos/invalid",
  eventGenres: "omega/ecosystem/alumnos/genres",
} as const;

