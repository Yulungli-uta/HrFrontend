import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmployeePositionsAPI, type EmployeePosition } from "@/lib/api";

/**
 * Posiciones vigentes de los empleados de la página visible, agrupadas por empleado (la principal primero).
 * Pide solo los ids de la página (máximo 200) y no consulta si no hay ninguno.
 */
export function useEmployeePositions(employeeIds: number[]) {
  const ids = useMemo(() => Array.from(new Set(employeeIds.filter((id) => id > 0))).slice(0, 200).sort((a, b) => a - b), [employeeIds]);
  const query = useQuery({
    queryKey: ["employee-positions", ids.join(",")],
    queryFn: () => EmployeePositionsAPI.getByEmployees(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });

  const byEmployee = useMemo(() => {
    const map = new Map<number, EmployeePosition[]>();
    if (query.data?.status === "success") {
      for (const position of query.data.data ?? []) map.set(position.employeeId, [...(map.get(position.employeeId) ?? []), position]);
    }
    return map;
  }, [query.data]);

  return { byEmployee, isLoading: query.isLoading, isError: query.isError || query.data?.status === "error" };
}
