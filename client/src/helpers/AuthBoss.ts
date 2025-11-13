// src/helpers/AuthBoss.ts
import { useEffect, useState } from "react";
import { VistaDetallesEmpleadosAPI } from "@/lib/api";

export function getBossFromEmployeeDetails(employeeDetails: any) {
  const bossId =
    employeeDetails?.immediateBossID ??
    employeeDetails?.bossEmployeeID ??
    employeeDetails?.supervisorId ??
    employeeDetails?.immediateBossId ??
    employeeDetails?.jefeInmediatoId ??
    null;

  const bossName =
    employeeDetails?.bossFullName ??
    employeeDetails?.supervisorName ??
    employeeDetails?.immediateBossName ??
    employeeDetails?.jefeInmediatoNombre ??
    null;

  return { bossId, bossName };
}

export function useImmediateBoss(employeeId?: number) {
  const [bossId, setBossId] = useState<number | null>(null);
  const [bossName, setBossName] = useState<string | null>(null);
  const [bossDepartment, setBossDepartment] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!employeeId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await VistaDetallesEmpleadosAPI.get(employeeId);
        if (res.status === "success" && res.data) {
          const d = res.data as any;
          if (d.immediateBossID || d.bossEmployeeID) {
            const bid = d.immediateBossID ?? d.bossEmployeeID;
            setBossId(bid);
            setBossName(d.bossFullName ?? d.bossName ?? `Jefe #${bid}`);
            setBossDepartment(d.bossDepartment ?? d.department ?? null);
          } else {
            setError("No se encontró el jefe inmediato en su ficha.");
          }
        } else {
          setError("No fue posible obtener su ficha laboral.");
        }
      } catch (e: any) {
        setError(e?.message ?? "Error consultando jefe inmediato.");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [employeeId]);

  return { bossId, bossName, bossDepartment, isLoading, error };
}
