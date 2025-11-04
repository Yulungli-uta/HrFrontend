import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VacacionesAPI, PermisosAPI, type ApiResponse } from "@/lib/api";
import type { InsertVacacion } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";

/** Utils */
const dateOnly = (s: string) => s.split("T")[0];
const toDate = (s: string) => new Date(dateOnly(s) + "T00:00:00");
const rangesOverlap = (a1: string, a2: string, b1: string, b2: string) => {
  const as = toDate(a1).getTime(), ae = toDate(a2).getTime();
  const bs = toDate(b1).getTime(), be = toDate(b2).getTime();
  return as <= be && bs <= ae;
};
const clean = (obj: any) => {
  const o: any = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") return;
    o[k] = v;
  });
  return o;
};
// Estados activos
const isActivePermission = (s?: string) => s === "Pending" || s === "Approved";
const isActiveVacation   = (s?: string) => s === "Planned" || s === "InProgress";

interface VacationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function VacationForm({ onSuccess, onCancel }: VacationFormProps) {
  const queryClient = useQueryClient();
  const { employeeDetails } = useAuth();
  const employeeId = employeeDetails?.employeeID ?? 0;

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: permsResp } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId],
    queryFn: () => PermisosAPI.getByEmployee(employeeId),
    enabled: employeeId > 0,
  });
  const { data: vacsResp } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId],
    queryFn: () => VacacionesAPI.getByEmployee(employeeId),
    enabled: employeeId > 0,
  });

  const existingPerms = useMemo(() => (permsResp?.status === "success" ? permsResp.data || [] : []), [permsResp]);
  const existingVacs  = useMemo(() => (vacsResp?.status === "success" ? vacsResp.data || [] : []), [vacsResp]);

  const [formData, setFormData] = useState<Omit<InsertVacacion, "id">>({
    employeeId,
    startDate: today,
    endDate: today,
    daysGranted: 1, // calculado
    daysTaken: 1,   // calculado
    approvedBy: null,
    approvedAt: null,
    status: "Planned",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    if (employeeId) setFormData(prev => ({ ...prev, employeeId }));
  }, [employeeId]);

  const calcDays = (s: string, e: string) => {
    const ds = toDate(s).getTime(), de = toDate(e).getTime();
    return Math.max(0, Math.floor((de - ds) / 86400000) + 1);
    // Si deseas excluir fines de semana/feriados, aquí integrarías HolidaysAPI.isHoliday(...)
  };

  const handleDateChange = (field: "startDate" | "endDate", v: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: v };
      const days = calcDays(next.startDate, next.endDate);
      next.daysGranted = days;
      next.daysTaken = days;
      next.updatedAt = new Date().toISOString();
      return next;
    });
  };

  // Validación de traslapes
  useEffect(() => {
    const s = formData.startDate, e = formData.endDate;

    const cVac = (existingVacs || []).some((v: any) => isActiveVacation(v.status) && rangesOverlap(s, e, v.startDate, v.endDate ?? v.startDate));
    if (cVac) {
      setErrorMsg("El rango se traslapa con vacaciones activas.");
      return;
    }
    const cPerm = (existingPerms || []).some((p: any) => isActivePermission(p.status) && rangesOverlap(s, e, p.startDate, p.endDate ?? p.startDate));
    if (cPerm) {
      setErrorMsg("El rango se traslapa con permisos activos.");
      return;
    }
    setErrorMsg("");
  }, [formData.startDate, formData.endDate, existingPerms, existingVacs]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = clean({
        employeeId,
        startDate: dateOnly(formData.startDate),
        endDate: dateOnly(formData.endDate),
        daysGranted: formData.daysGranted,
        daysTaken: formData.daysTaken,
        status: "Planned",
      }) as Partial<InsertVacacion>;

      return VacacionesAPI.create(payload as InsertVacacion);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId] });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errorMsg) return;
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Fecha Inicio</Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => handleDateChange("startDate", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Fecha Fin</Label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => handleDateChange("endDate", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Días Concedidos</Label>
          <Input type="number" value={formData.daysGranted} readOnly />
        </div>
        <div>
          <Label>Días Tomados</Label>
          <Input type="number" value={formData.daysTaken} readOnly />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!!errorMsg || mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? "Enviando…" : "Solicitar Vacaciones"}
        </Button>
      </div>
    </form>
  );
}
