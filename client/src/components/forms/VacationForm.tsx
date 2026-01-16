import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VacacionesAPI, PermisosAPI, TimeBalanceAPI, ParametersAPI, apiFetch, type ApiResponse } from "@/lib/api";
import type { InsertVacacion } from "@/shared/schema";
import { useAuth } from "@/contexts/AuthContext";

/** Utils */
const localTodayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const dateOnly = (s: string) => String(s).split("T")[0];
const toDate = (s: string) => new Date(dateOnly(s) + "T00:00:00");
const rangesOverlap = (a1: string, a2: string, b1: string, b2: string) => {
  const as = toDate(a1).getTime(),
    ae = toDate(a2).getTime();
  const bs = toDate(b1).getTime(),
    be = toDate(b2).getTime();
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

const normStatus = (s?: string) => (s ?? "").trim().toLowerCase();
const isExcludedPermission = (s?: string) =>
  ["rejected", "rechazado", "canceled", "cancelled", "cancelado", "anulado", "anulada", "annulled", "void"].includes(normStatus(s));
const isActivePermission = (s?: string) => {
  const st = normStatus(s);
  if (!st) return true;
  return !isExcludedPermission(s);
};

const isExcludedVacation = (s?: string) =>
  ["canceled", "cancelled", "cancelado", "anulado", "anulada", "annulled", "void"].includes(normStatus(s));
const isActiveVacation = (s?: string) => {
  const st = normStatus(s);
  if (!st) return true;
  return !isExcludedVacation(s);
};

const fmtMinutes = (min?: number | null) => {
  const m = Math.max(0, Number(min ?? 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (!h && !mm) return "0m";
  if (!h) return `${mm}m`;
  if (!mm) return `${h}h`;
  return `${h}h ${mm}m`;
};

interface VacationFormProps {
  onSuccess: (isEdit: boolean) => void;
  onCancel: () => void;
  initialVacation?: any | null; // enable edit for Planned
  timeBalance?: any | null; // optional preloaded balance
}

export default function VacationForm({
  onSuccess,
  onCancel,
  initialVacation = null,
  timeBalance = null,
}: VacationFormProps) {
  const queryClient = useQueryClient();
  const { employeeDetails } = useAuth();
  const employeeId = employeeDetails?.employeeID ?? 0;

  const today = useMemo(() => localTodayISO(), []);
  const [errorMsg, setErrorMsg] = useState("");

  const isEdit = !!initialVacation;
  const currentId = initialVacation?.id ?? initialVacation?.vacationId ?? initialVacation?.vacationID ?? null;

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
  const existingVacs = useMemo(() => (vacsResp?.status === "success" ? vacsResp.data || [] : []), [vacsResp]);

  // Load WORK_MINUTES_PER_DAY from CV Parameters (fallback 480)
  const { data: paramsResp } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/cv/parameters", "WORK_MINUTES_PER_DAY"],
    queryFn: () => (ParametersAPI as any).getAll?.() ?? apiFetch<any>("/api/v1/rh/cv/parameters"),
  });

  const workMinutesPerDay = useMemo(() => {
    const data = (paramsResp as any)?.data;
    const list = Array.isArray(data) ? data : data?.items ?? [];
    const p = list.find((x: any) => (x?.name ?? "").trim() === "WORK_MINUTES_PER_DAY");
    const v = Number(p?.pvalues ?? p?.value ?? p?.Value ?? p?.pValue);
    return Number.isFinite(v) && v > 0 ? v : 480;
  }, [paramsResp]);

  // Time balance (minutes available)
  const { data: balanceResp } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/timebalances", "by-employee", employeeId],
    queryFn: () => TimeBalanceAPI.getByEmployee(employeeId),
    enabled: employeeId > 0 && !timeBalance,
  });

  const balance = timeBalance ?? (balanceResp?.status === "success" ? balanceResp.data : null);
  const vacationAvailableMin = Number(
    balance?.vacationAvailableMin ?? balance?.vacationAvailable ?? balance?.vacationMin ?? 0
  );

  const [formData, setFormData] = useState<Omit<InsertVacacion, "id">>({
    employeeId,
    startDate: today,
    endDate: today,
    daysGranted: 1,
    daysTaken: 1,
    approvedBy: null,
    approvedAt: null,
    status: "Planned",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    if (employeeId) setFormData((prev) => ({ ...prev, employeeId }));
  }, [employeeId]);

  // preload edit
  useEffect(() => {
    if (!initialVacation) return;
    const s = initialVacation?.startDate ?? initialVacation?.StartDate;
    const e = initialVacation?.endDate ?? initialVacation?.EndDate ?? s;

    setFormData((prev) => ({
      ...prev,
      startDate: s ? dateOnly(String(s)) : prev.startDate,
      endDate: e ? dateOnly(String(e)) : prev.endDate,
      status: initialVacation?.status ?? initialVacation?.Status ?? prev.status,
      updatedAt: new Date().toISOString(),
    }));
  }, [initialVacation]);

  const calcDays = (s: string, e: string) => {
    const ds = toDate(s).getTime(),
      de = toDate(e).getTime();
    return Math.max(0, Math.floor((de - ds) / 86400000) + 1);
  };

  const handleDateChange = (field: "startDate" | "endDate", v: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: v };
      const days = calcDays(next.startDate, next.endDate);
      next.daysGranted = days;
      next.daysTaken = days;
      next.updatedAt = new Date().toISOString();
      return next;
    });
  };

  // ===== ✅ Control duro de SALDO (tiempo real) =====
  const requestedMinutes = useMemo(() => (Number(formData.daysTaken ?? 0) * workMinutesPerDay), [formData.daysTaken, workMinutesPerDay]);

  const originalMinutes = useMemo(() => {
    if (!isEdit) return 0;
    return (
      Number(initialVacation?.hourTaken ?? initialVacation?.HourTaken ?? 0) ||
      Number(initialVacation?.minutesTaken ?? initialVacation?.MinutesTaken ?? 0) ||
      (Number(initialVacation?.daysTaken ?? initialVacation?.DaysTaken ?? 0) * workMinutesPerDay) ||
      0
    );
  }, [isEdit, initialVacation, workMinutesPerDay]);

  const allowedMinutes = useMemo(() => vacationAvailableMin + (isEdit ? originalMinutes : 0), [vacationAvailableMin, isEdit, originalMinutes]);

  const insufficientBalance = useMemo(() => {
    if (!balance) return false; // si no hay saldo, UI no bloquea; backend debe bloquear
    return requestedMinutes > allowedMinutes;
  }, [balance, requestedMinutes, allowedMinutes]);

  // Validación de traslapes + fechas + saldo
  useEffect(() => {
    const s = formData.startDate,
      e = formData.endDate;

    if (s < today) {
      setErrorMsg("No se permite seleccionar fechas anteriores a hoy.");
      return;
    }
    if (e < s) {
      setErrorMsg("La fecha 'Hasta' no puede ser anterior a 'Desde'.");
      return;
    }

    const cVac = (existingVacs || []).some((v: any) => {
      const otherId = v?.id ?? v?.vacationId ?? v?.vacationID;
      if (isEdit && currentId != null && String(otherId) === String(currentId)) return false;
      return isActiveVacation(v.status) && rangesOverlap(s, e, v.startDate, v.endDate ?? v.startDate);
    });

    if (cVac) {
      setErrorMsg("El rango se traslapa con vacaciones activas.");
      return;
    }

    const cPerm = (existingPerms || []).some((p: any) => isActivePermission(p.status) && rangesOverlap(s, e, p.startDate, p.endDate ?? p.startDate));
    if (cPerm) {
      setErrorMsg("El rango se traslapa con permisos activos.");
      return;
    }

    // ✅ CONTROL SALDO
    if (balance && insufficientBalance) {
      setErrorMsg(`Saldo insuficiente. Disponible: ${fmtMinutes(vacationAvailableMin)}. Solicitado: ${fmtMinutes(requestedMinutes)}.`);
      return;
    }

    setErrorMsg("");
  }, [
    formData.startDate,
    formData.endDate,
    existingPerms,
    existingVacs,
    today,
    isEdit,
    currentId,
    balance,
    insufficientBalance,
    vacationAvailableMin,
    requestedMinutes,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      // ✅ doble seguridad
      if (balance && insufficientBalance) {
        throw new Error(`Saldo insuficiente. Disponible: ${fmtMinutes(vacationAvailableMin)}. Solicitado: ${fmtMinutes(requestedMinutes)}.`);
      }

      const payload = clean({
        employeeId,
        startDate: dateOnly(formData.startDate),
        endDate: dateOnly(formData.endDate),
        daysGranted: formData.daysGranted,
        daysTaken: formData.daysTaken,
        status: "Planned",
      }) as Partial<InsertVacacion>;

      // EDIT (si tu API soporta update)
      if (isEdit && currentId != null) {
        const upd = (VacacionesAPI as any).update ?? (VacacionesAPI as any).put;
        if (typeof upd === "function") return upd(currentId, payload);
        return apiFetch<any>(`/api/v1/rh/vacations/${currentId}`, { method: "PUT", body: payload });
      }

      // CREATE
      return VacacionesAPI.create(payload as InsertVacacion);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId] });
      onSuccess(!!isEdit);
    },
    onError: (err: any) => {
      const msg = err?.message ?? "No se pudo guardar.";
      setErrorMsg(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errorMsg) return;
    if (insufficientBalance) return;
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(errorMsg || insufficientBalance) && (
        <div className="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
          {errorMsg || "Saldo insuficiente para el rango seleccionado."}
        </div>
      )}

      {/* Panel rápido saldo vs solicitado */}
      {balance && (
        <div className="rounded-lg border bg-card p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Saldo disponible</span>
            <span className="font-medium">{fmtMinutes(vacationAvailableMin)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">Solicitado (calculado)</span>
            <span className={`font-medium ${insufficientBalance ? "text-red-600" : ""}`}>{fmtMinutes(requestedMinutes)}</span>
          </div>
          {isEdit && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Ajuste por edición</span>
              <span className="font-medium">+ {fmtMinutes(originalMinutes)}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Fecha Inicio</Label>
          <Input
            type="date"
            min={today}
            value={formData.startDate}
            onChange={(e) => handleDateChange("startDate", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Fecha Fin</Label>
          <Input
            type="date"
            min={formData.startDate}
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
        <Button type="submit" disabled={!!errorMsg || insufficientBalance || mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? "Enviando…" : isEdit ? "Guardar cambios" : "Solicitar Vacaciones"}
        </Button>
      </div>
    </form>
  );
}
