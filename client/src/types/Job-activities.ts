//src/types/Job-activities.ts   

export interface Degree {
  degreeId: number;
  description: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface OccupationalGroup {
  groupId: number;
  description: string;
  rmu: number;
  degreeId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface Job {
  jobID: number;
  description: string | null;
  jobTypeId: number | null;
  groupId: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export type ActivityType = "LABORAL" | "ADICIONAL";

export interface Activity {
  activitiesID: number;
  description: string | null;
  activitiesType: ActivityType;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

/**
 * JobActivity: para frontend agregamos un id sintético (string)
 * para poder usarlo como key y manejar delete aunque el PK real
 * en BD sea compuesto (ActivitiesID, JobID).
 */
export interface JobActivity {
  id: string; // id sintético para React/UI
  activitiesID: number;
  jobID: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

/* ===========================
   NORMALIZADORES DESDE API
   =========================== */

export function normalizeDegree(raw: any): Degree {
  return {
    degreeId:
      raw.degreeId ?? raw.DegreeId ?? raw.degreeID ?? 0,
    description: raw.description ?? raw.Description ?? "",
    isActive: raw.isActive ?? raw.IsActive ?? true,
    createdAt: raw.createdAt ?? raw.CreatedAt,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
  };
}

export function normalizeOccupationalGroup(raw: any): OccupationalGroup {
  return {
    groupId: raw.groupId ?? raw.GroupId ?? raw.groupID ?? 0,
    description: raw.description ?? raw.Description ?? "",
    rmu: Number(
      raw.rmu ?? raw.Rmu ?? raw.RMU ?? 0
    ),
    degreeId:
      raw.degreeId ?? raw.DegreeId ?? raw.degreeID ?? 0,
    isActive: raw.isActive ?? raw.IsActive ?? true,
    createdAt: raw.createdAt ?? raw.CreatedAt,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
  };
}

export function normalizeJob(raw: any): Job {
  return {
    jobID: raw.jobID ?? raw.jobId ?? raw.JobID ?? 0,
    description: raw.description ?? raw.Description ?? null,
    jobTypeId:
      raw.jobTypeId ?? raw.JobTypeId ?? raw.jobTypeID ?? null,
    groupId:
      raw.groupId ?? raw.GroupId ?? raw.groupID ?? null,
    isActive: raw.isActive ?? raw.IsActive ?? true,
    createdAt: raw.createdAt ?? raw.CreatedAt,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
  };
}

export function normalizeActivity(raw: any): Activity {
  const type =
    raw.activitiesType ??
    raw.ActivitiesType ??
    raw.type ??
    "LABORAL";

  return {
    activitiesID:
      raw.activitiesID ?? raw.activitiesId ?? raw.ActivitiesID ?? raw.ActivitiesId ?? 0,
    description: raw.description ?? raw.Description ?? null,
    activitiesType:
      type === "ADICIONAL" ? "ADICIONAL" : "LABORAL",
    isActive: raw.isActive ?? raw.IsActive ?? true,
    createdAt: raw.createdAt ?? raw.CreatedAt,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
  };
}

export function normalizeJobActivity(raw: any): JobActivity {
  const activitiesID =
    raw.activitiesID ??
    raw.activitiesId ??
    raw.ActivitiesID ??
    raw.ActivitiesId ??
    0;

  const jobID =
    raw.jobID ?? raw.jobId ?? raw.JobID ?? 0;

  // Si backend devuelve algún ID propio, lo usamos; si no, combinamos
  const idRaw =
    raw.jobActivityID ??
    raw.jobActivityId ??
    raw.JobActivityId ??
    `${jobID}-${activitiesID}`;

  return {
    id: String(idRaw),
    activitiesID,
    jobID,
    isActive: raw.isActive ?? raw.IsActive ?? true,
    createdAt: raw.createdAt ?? raw.CreatedAt,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
  };
}