// src/components/job-activities/academicGroupLookup.ts
import { OccupationalGroupAPI } from "@/lib/api";
import { normalizeOccupationalGroup, type OccupationalGroup } from "@/types/Job-activities";
import { academicGroupSearch, groupMatchesLevel, type LadderLevel } from "./academicGroups";

/** Grupo ocupacional que corresponde a un nivel del escalafón de titulares (búsqueda en el servidor), o null si no existe. */
export async function findAcademicGroup(level: LadderLevel): Promise<OccupationalGroup | null> {
  const res = await OccupationalGroupAPI.listPaged({
    page: 1,
    pageSize: 20,
    search: academicGroupSearch(level),
    sortBy: "description",
  });
  if (res.status !== "success") return null;
  return res.data.items.map(normalizeOccupationalGroup).find((g) => groupMatchesLevel(g.description, level)) ?? null;
}
