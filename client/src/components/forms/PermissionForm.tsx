import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PermisosAPI, VacacionesAPI, TiposPermisosAPI, type ApiResponse } from "@/lib/api";
import type { InsertPermiso } from "@shared/schema";
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

type RangeMode = "full-day" | "multi-day" | "hours";
type PermissionType = {
  typeId: number;
  name: string;
  deductsFromVacation: boolean;
  requiresApproval: boolean;
  maxDays?: number | null;
};

interface PermissionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PermissionForm({ onSuccess, onCancel }: PermissionFormProps) {
  const queryClient = useQueryClient();
  const { employeeDetails } = useAuth();
  const employeeId = employeeDetails?.employeeID ?? 0;

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [mode, setMode] = useState<RangeMode>("full-day");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: typesResp } = useQuery<ApiResponse<PermissionType[]>>({
    queryKey: ["/api/v1/rh/permission-types"],
    queryFn: () => TiposPermisosAPI.list(),
  });
  const types = typesResp?.status === "success" ? (typesResp.data || []) : [];
  const typeMap = useMemo(() => new Map(types.map(t => [t.typeId, t])), [types]);

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

  const [formData, setFormData] = useState<Omit<InsertPermiso, "id">>({
    employeeId,
    permissionTypeId: 0,
    startDate: today,
    endDate: today,
    requestDate: new Date().toISOString(),
    justification: "",
    status: "Pending",
    approvedBy: null,
    approvedAt: null,
    chargedToVacation: false,
    hourTaken: null,
    vacationId: null,
  });

  useEffect(() => {
    if (employeeId) setFormData(prev => ({ ...prev, employeeId }));
  }, [employeeId]);

  useEffect(() => {
    if (types.length && !formData.permissionTypeId) {
      setFormData(prev => ({ ...prev, permissionTypeId: types[0].typeId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types]);

  const selectedType = typeMap.get(formData.permissionTypeId || 0);

  useEffect(() => {
    if (!selectedType) return;
    setFormData(prev => ({ ...prev, chargedToVacation: !!selectedType.deductsFromVacation }));
  }, [selectedType]);

  const computeDays = (s: string, e: string) => {
    const ds = toDate(s).getTime(), de = toDate(e).getTime();
    return Math.max(0, Math.floor((de - ds) / 86400000) + 1);
  };

  useEffect(() => {
    if (mode !== "hours") return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diff = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    setFormData(prev => ({ ...prev, hourTaken: +(diff / 60).toFixed(2), endDate: prev.startDate }));
  }, [mode, startTime, endTime]);

  const handleChange = (field: keyof InsertPermiso, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validaciones: traslapes + misma fecha + horas
  useEffect(() => {
    const reqStart = formData.startDate;
    const reqEnd = mode === "multi-day" ? formData.endDate : formData.startDate;

    // Contra permisos activos (rango)
    if ((existingPerms || []).some((p: any) =>
      isActivePermission(p.status) && rangesOverlap(reqStart, reqEnd, p.startDate, p.endDate ?? p.startDate))) {
      // Si es por horas y existe un permiso de día completo ese día, bloquear
      if (mode === "hours") {
        const sameDayFull = (existingPerms || []).some((p: any) =>
          isActivePermission(p.status) &&
          dateOnly(p.startDate) === dateOnly(reqStart) &&
          dateOnly(p.endDate ?? p.startDate) === dateOnly(reqStart) &&
          (!p.hourTaken || p.hourTaken === 0)
        );
        if (sameDayFull) {
          setErrorMsg("Ya existe un permiso de día completo en ese día.");
          return;
        }
        // Sin horas en backend: bloquear múltiples horas el mismo día
        const sameDayHours = (existingPerms || []).some((p: any) =>
          isActivePermission(p.status) &&
          dateOnly(p.startDate) === dateOnly(reqStart) &&
          (p.hourTaken ?? 0) > 0
        );
        if (sameDayHours) {
          setErrorMsg("Ya existe un permiso por horas en ese día (no se puede verificar solapes de horario).");
          return;
        }
      } else {
        setErrorMsg("El rango se traslapa con otro permiso activo.");
        return;
      }
    }

    // Contra vacaciones activas (rango)
    if ((existingVacs || []).some((v: any) =>
      isActiveVacation(v.status) && rangesOverlap(reqStart, reqEnd, v.startDate, v.endDate ?? v.startDate))) {
      setErrorMsg("El rango se traslapa con vacaciones activas.");
      return;
    }

    // Máximo de días por tipo
    if (selectedType?.maxDays && mode !== "hours") {
      const daysCount = mode === "full-day" ? 1 : computeDays(formData.startDate, formData.endDate);
      if (daysCount > selectedType.maxDays) {
        setErrorMsg("El rango excede el máximo de días permitido para este tipo.");
        return;
      }
    }

    setErrorMsg("");
  }, [formData.startDate, formData.endDate, mode, existingPerms, existingVacs, selectedType]);

  const mutation = useMutation({
    mutationFn: async () => {
      const base: any = {
        employeeId,
        permissionTypeId: formData.permissionTypeId,
        startDate: dateOnly(formData.startDate),
        endDate: dateOnly(mode === "multi-day" ? formData.endDate : formData.startDate),
        justification: formData.justification,
        chargedToVacation: !!formData.chargedToVacation,
        status: "Pending",
      };
      if (mode === "hours") base.hourTaken = formData.hourTaken ?? 0;

      return PermisosAPI.create(clean(base) as InsertPermiso);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId] });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errorMsg) return;
    if (!formData.permissionTypeId) {
      setErrorMsg("Seleccione un tipo de permiso.");
      return;
    }
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
          <Label>Tipo de Permiso</Label>
          <Select
            value={String(formData.permissionTypeId || "")}
            onValueChange={(v) => handleChange("permissionTypeId", parseInt(v))}
          >
            <SelectTrigger aria-label="Tipo de permiso">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.typeId} value={String(t.typeId)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedType && (
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <div>• {selectedType.deductsFromVacation ? "Descuenta" : "No descuenta"} de vacaciones</div>
              {selectedType.maxDays ? <div>• Máx. días: {selectedType.maxDays}</div> : null}
              <div>• {selectedType.requiresApproval ? "Requiere aprobación" : "No requiere aprobación"}</div>
            </div>
          )}
        </div>

        <div>
          <Label>Modo</Label>
          <Select value={mode} onValueChange={(v: RangeMode) => setMode(v)}>
            <SelectTrigger aria-label="Modo del permiso">
              <SelectValue placeholder="Seleccionar modo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-day">Todo el día</SelectItem>
              <SelectItem value="multi-day">Varios días</SelectItem>
              <SelectItem value="hours">Por horas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Fecha Inicio</Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
            required
          />
        </div>

        {mode === "multi-day" ? (
          <div>
            <Label>Fecha Fin</Label>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              required
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={!!formData.chargedToVacation}
              onCheckedChange={(v) => handleChange("chargedToVacation", v)}
              id="chargedToVacation"
              disabled={!!selectedType}
            />
            <Label htmlFor="chargedToVacation">
              Descontar de vacaciones {selectedType ? "(definido por el tipo)" : ""}
            </Label>
          </div>
        )}
      </div>

      {mode === "hours" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Hora inicio</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <Label>Hora fin</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div>
            <Label>Horas calculadas</Label>
            <Input value={formData.hourTaken ?? 0} readOnly />
          </div>
        </div>
      )}

      {mode !== "hours" && selectedType?.maxDays ? (
        <div className="text-sm">
          <span className="text-gray-600">
            Días solicitados: <b>{mode === "full-day" ? 1 : computeDays(formData.startDate, formData.endDate)}</b> / Máx permitido: <b>{selectedType.maxDays}</b>
          </span>
        </div>
      ) : null}

      <div>
        <Label>Justificación</Label>
        <Textarea
          value={formData.justification}
          onChange={(e) => handleChange("justification", e.target.value)}
          placeholder="Describa el motivo del permiso…"
          rows={3}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!!errorMsg || mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? "Enviando…" : "Solicitar Permiso"}
        </Button>
      </div>
    </form>
  );
}
