import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { DegreeAPI, OccupationalGroupAPI } from "@/lib/api";
import { JOB_ACTIVITIES_KEYS } from "./queryKeys";
import { normalizeOccupationalGroup, type OccupationalGroup } from "@/types/Job-activities";

/**
 * Nombres de los registros de una página (grados o grupos) sin cargar todo el catálogo:
 * se pide cada id distinto una sola vez y se guarda en caché.
 */
function useLabels(kind: "degree" | "group", ids: Array<number | null | undefined>) {
  const distinct = useMemo(() => Array.from(new Set(ids.filter((id): id is number => !!id && id > 0))), [ids]);
  const results = useQueries({
    queries: distinct.map((id) => ({
      queryKey: [...JOB_ACTIVITIES_KEYS.labels, kind, id],
      queryFn: async () => {
        const res = kind === "degree" ? await DegreeAPI.get(id) : await OccupationalGroupAPI.get(id);
        if (res.status !== "success") return null;
        const raw: any = res.data;
        return String(raw.description ?? raw.Description ?? "");
      },
      staleTime: 10 * 60 * 1000,
    })),
  });
  return useMemo(() => {
    const map = new Map<number, string>();
    distinct.forEach((id, i) => {
      const label = results[i]?.data;
      if (label) map.set(id, label);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distinct, results.map((r) => r.data).join("|")]);
}

export const useDegreeNames = (ids: Array<number | null | undefined>) => useLabels("degree", ids);
export const useGroupNames = (ids: Array<number | null | undefined>) => useLabels("group", ids);

/**
 * Grupos ocupacionales completos de una página de cargos (para mostrar su clasificación UEP), pidiendo cada id una sola vez.
 * Comparte la caché con el resto de etiquetas.
 */
export function useGroupDetails(ids: Array<number | null | undefined>) {
  const distinct = useMemo(() => Array.from(new Set(ids.filter((id): id is number => !!id && id > 0))), [ids]);
  const results = useQueries({
    queries: distinct.map((id) => ({
      queryKey: [...JOB_ACTIVITIES_KEYS.labels, "group-detail", id],
      queryFn: async () => {
        const res = await OccupationalGroupAPI.get(id);
        return res.status === "success" ? normalizeOccupationalGroup(res.data) : null;
      },
      staleTime: 10 * 60 * 1000,
    })),
  });
  return useMemo(() => {
    const map = new Map<number, OccupationalGroup>();
    distinct.forEach((id, i) => {
      const group = results[i]?.data;
      if (group) map.set(id, group);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distinct, results.map((r) => r.dataUpdatedAt).join("|")]);
}
