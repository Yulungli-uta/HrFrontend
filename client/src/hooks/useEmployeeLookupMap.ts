// src/hooks/useEmployeeLookupMap.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { VistaDetallesEmpleadosAPI } from "@/lib/api";

export interface EmployeeLite {
  employeeID: number;
  fullName: string;
  departmentName?: string;
}

function pick(obj: any, names: string[]) {
  for (const name of names) {
    const v = obj?.[name];
    if (v != null) return v;
  }
  return undefined;
}

function toNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Mapa id→datos de empleado para resolver nombres en tablas de despliegue (ej. bandejas de
 * aprobación). Consulta única compartida (mismo queryKey en todos los consumidores) — antes
 * cada pantalla duplicaba esta misma llamada a `VistaDetallesEmpleadosAPI.list()` con su
 * propio queryKey ad-hoc.
 */
export function useEmployeeLookupMap() {
  const { data: employeesRes, isLoading } = useQuery({
    queryKey: ["employee-details-lookup-map"],
    queryFn: () => VistaDetallesEmpleadosAPI.list(),
    staleTime: 5 * 60 * 1000,
  });

  const employeesMap: Record<number, EmployeeLite> = useMemo(() => {
    if (employeesRes?.status !== "success") return {};
    const raw = (employeesRes as any).data ?? [];
    const arr = Array.isArray(raw) ? raw : raw?.items ?? [];
    const map: Record<number, EmployeeLite> = {};
    for (const r of arr) {
      const id = toNumber(pick(r, ["employeeID", "EmployeeID", "id", "Id", "ID"]));
      const fullName =
        pick(r, ["fullName", "FullName"]) ??
        `${pick(r, ["lastName", "LastName"]) ?? ""} ${pick(r, ["firstName", "FirstName"]) ?? ""}`.trim();
      if (id != null) {
        map[id] = {
          employeeID: id,
          fullName: fullName || `#${id}`,
          departmentName: pick(r, ["departmentName", "DepartmentName"]),
        };
      }
    }
    return map;
  }, [employeesRes]);

  return { employeesMap, isLoading };
}
