/** Prefijo de caché de toda la pantalla de cargos y actividades: invalidarlo refresca todos sus listados. */
export const JOB_ACTIVITIES_QUERY_KEY = ["job-activities"] as const;

export const JOB_ACTIVITIES_KEYS = {
  jobs: [...JOB_ACTIVITIES_QUERY_KEY, "jobs"],
  degrees: [...JOB_ACTIVITIES_QUERY_KEY, "degrees"],
  groups: [...JOB_ACTIVITIES_QUERY_KEY, "groups"],
  activities: [...JOB_ACTIVITIES_QUERY_KEY, "activities"],
  assignActivities: [...JOB_ACTIVITIES_QUERY_KEY, "assign-activities"],
  assigned: [...JOB_ACTIVITIES_QUERY_KEY, "assigned"],
  counts: [...JOB_ACTIVITIES_QUERY_KEY, "counts"],
  labels: [...JOB_ACTIVITIES_QUERY_KEY, "labels"],
} as const;
