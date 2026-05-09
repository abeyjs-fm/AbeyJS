export const StudentsEcosystem = {
  agentId: "ecosystem:students:agent",
  flowId: "ecosystem:students:flow",

  intentInit: "Students/Init",
  intentCreate: "Students/Create",
  intentUpdate: "Students/Update",
  intentDelete: "Students/Delete",
  intentLoadGenres: "Students/LoadGenres",

  eventChanged: "omega/ecosystem/students/changed",
  eventInvalid: "omega/ecosystem/students/invalid",
  eventGenres: "omega/ecosystem/students/genres",
} as const;

