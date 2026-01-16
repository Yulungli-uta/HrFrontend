// src/components/forms/PermissionForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import {
  PermisosAPI,
  VacacionesAPI,
  TiposPermisosAPI,
  type ApiResponse,
  apiFetch,
} from "@/lib/api";

import type { InsertPermiso } from "@/shared/schema";
import { useAuth } from "@/contexts/AuthContext";

import {
  ReusableDocumentManager,
  type ReusableDocumentManagerHandle,
} from "@/components/ReusableDocumentManager";

// -----------------------
// Utils
// -----------------------
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
  const as = toDate(a1).getTime();
  const ae = toDate(a2).getTime();
  const bs = toDate(b1).getTime();
  const be = toDate(b2).getTime();
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

const toBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";

const extractPermissionId = (resp: any): string | null => {
  const base = resp?.status === "success" ? resp?.data : resp?.data ?? resp;
  const id =
    base?.permissionId ??
    base?.PermissionId ??
    base?.id ??
    base?.ID ??
    base?.Id ??
    base?.data?.permissionId ??
    base?.data?.id;
  return id != null ? String(id) : null;
};

type RangeMode = "full-day" | "multi-day" | "hours";

type PermissionType = {
  typeId: number;
  name: string;
  deductsFromVacation: boolean;
  requiresApproval: boolean;
  maxDays?: number | null;

  // flag docs
  AttachedFile?: boolean | number | string;
  attachedFile?: boolean | number | string;
  requiresDocumentation?: boolean | number | string;
};

type TimeBalance = {
  employeeID: number;
  vacationAvailableMin: number;
  recoveryPendingMin: number;
};

export type DocumentsConfig = {
  directoryCode: string; // HRPERMISSION
  entityType: string; // "PERMISSION"
  relativePath?: string;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  documentType?: { enabled: boolean; required?: boolean; category?: string };
};

interface PermissionFormProps {
  onSuccess: (isEdit: boolean) => void;
  onCancel: () => void;
  initialPermission?: any | null;
  timeBalance?: TimeBalance | null;
  documents: DocumentsConfig;
  workMinutesPerDay: number; // ✅ viene desde la page
}

export default function PermissionForm({
  onSuccess,
  onCancel,
  initialPermission = null,
  timeBalance = null,
  documents,
  workMinutesPerDay,
}: PermissionFormProps) {
  const queryClient = useQueryClient();
  const { employeeDetails } = useAuth();
  const employeeId = employeeDetails?.employeeID ?? 0;

  const today = useMemo(() => localTodayISO(), []);
  const [mode, setMode] = useState<RangeMode>("full-day");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [errorMsg, setErrorMsg] = useState("");

  const docManagerRef = useRef<ReusableDocumentManagerHandle | null>(null);

  const editingId =
    initialPermission?.permissionId ??
    initialPermission?.PermissionId ??
    initialPermission?.id ??
    initialPermission?.ID ??
    null;

  const isEdit = editingId != null;

  // Types
  const { data: typesResp, isLoading: typesLoading } = useQuery<ApiResponse<PermissionType[]>>({
    queryKey: ["/api/v1/rh/permission-types"],
    queryFn: () => TiposPermisosAPI.list(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const types = useMemo(() => (typesResp?.status === "success" ? typesResp.data || [] : []), [typesResp]);
  const typeMap = useMemo(() => new Map(types.map((t) => [t.typeId, t])), [types]);

  // Existing perms/vacs (para validación cruces)
  const { data: permsResp } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId],
    queryFn: () => PermisosAPI.getByEmployee(employeeId),
    enabled: employeeId > 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: vacsResp } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId],
    queryFn: () => VacacionesAPI.getByEmployee(employeeId),
    enabled: employeeId > 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const existingPerms = useMemo(() => (permsResp?.status === "success" ? permsResp.data || [] : []), [permsResp]);
  const existingVacs = useMemo(() => (vacsResp?.status === "success" ? vacsResp.data || [] : []), [vacsResp]);

  // Defaults
  const defaults = useMemo<Omit<InsertPermiso, "id">>(() => {
    return {
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
      hourTaken: 0,
      vacationId: null,
    };
  }, [employeeId, today]);

  const [formData, setFormData] = useState<Omit<InsertPermiso, "id">>(defaults);

  useEffect(() => {
    if (employeeId) setFormData((p) => ({ ...p, employeeId }));
  }, [employeeId]);

  // Resolver tipo al editar (ID o nombre)
  const initialTypeIdFromRecord = useMemo(() => {
    if (!initialPermission) return 0;
    const typeId =
      initialPermission?.permissionTypeId ??
      initialPermission?.permissionTypeID ??
      initialPermission?.PermissionTypeId ??
      initialPermission?.typeId ??
      0;
    return Number(typeId || 0);
  }, [initialPermission]);

  const initialTypeNameFromRecord = useMemo(() => {
    if (!initialPermission) return "";
    return String(
      initialPermission?.permissionTypeName ??
        initialPermission?.typeName ??
        initialPermission?.permissionType ??
        ""
    ).trim();
  }, [initialPermission]);

  const resolvedInitialTypeId = useMemo(() => {
    if (!initialPermission) return 0;
    if (initialTypeIdFromRecord) return initialTypeIdFromRecord;

    if (initialTypeNameFromRecord && types.length) {
      const found = types.find(
        (t) => String(t.name).trim().toLowerCase() === initialTypeNameFromRecord.toLowerCase()
      );
      return found?.typeId ?? 0;
    }

    return 0;
  }, [initialPermission, initialTypeIdFromRecord, initialTypeNameFromRecord, types]);

  // Preload edit / reset create
  useEffect(() => {
    if (!initialPermission) {
      setFormData(defaults);
      setMode("full-day");
      setStartTime("08:00");
      setEndTime("12:00");
      setErrorMsg("");
      docManagerRef.current?.clearSelected();
      return;
    }

    const s = initialPermission?.startDate ?? initialPermission?.StartDate;
    const e = initialPermission?.endDate ?? initialPermission?.EndDate ?? s;

    const sd = s ? dateOnly(String(s)) : today;
    const ed = e ? dateOnly(String(e)) : sd;

    const hourTaken = Number(initialPermission?.hourTaken ?? initialPermission?.HourTaken ?? 0) || 0;

    setFormData((prev) => ({
      ...defaults,
      ...prev,
      permissionTypeId: resolvedInitialTypeId || prev.permissionTypeId,
      startDate: sd,
      endDate: ed,
      justification: String(initialPermission?.justification ?? initialPermission?.Justification ?? ""),
      chargedToVacation: Boolean(initialPermission?.chargedToVacation ?? initialPermission?.ChargedToVacation ?? false),
      status: String(initialPermission?.status ?? initialPermission?.Status ?? "Pending"),
      hourTaken,
    }));

    if (sd !== ed) setMode("multi-day");
    else {
      if (hourTaken > 0 && hourTaken < workMinutesPerDay) setMode("hours");
      else setMode("full-day");
    }

    setErrorMsg("");
    docManagerRef.current?.clearSelected();
  }, [initialPermission, defaults, today, resolvedInitialTypeId, workMinutesPerDay]);

  // Set default type para create
  useEffect(() => {
    if (!initialPermission && types.length && !formData.permissionTypeId) {
      setFormData((p) => ({ ...p, permissionTypeId: types[0].typeId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, initialPermission]);

  const selectedType = useMemo(() => typeMap.get(formData.permissionTypeId || 0), [typeMap, formData.permissionTypeId]);

  // chargedToVacation definido por tipo
  useEffect(() => {
    if (!selectedType) return;
    setFormData((p) => ({ ...p, chargedToVacation: !!selectedType.deductsFromVacation }));
  }, [selectedType]);

  const requiresDocs = useMemo(() => {
    if (!selectedType) return false;
    return toBool(selectedType.AttachedFile ?? selectedType.attachedFile ?? selectedType.requiresDocumentation ?? false);
  }, [selectedType]);

  useEffect(() => {
    if (!requiresDocs) docManagerRef.current?.clearSelected();
  }, [requiresDocs]);

  // Si edit + requiere docs: refresh lista de docs al abrir
  useEffect(() => {
    if (!isEdit) return;
    if (!requiresDocs) return;
    if (!editingId) return;
    docManagerRef.current?.refresh(String(editingId));
  }, [isEdit, requiresDocs, editingId]);

  const computeDays = (s: string, e: string) => {
    const ds = toDate(s).getTime();
    const de = toDate(e).getTime();
    return Math.max(0, Math.floor((de - ds) / 86400000) + 1);
  };

  // hours => minutes y endDate=startDate
  useEffect(() => {
    if (mode !== "hours") return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diff = Math.max(0, eh * 60 + em - (sh * 60 + sm));
    setFormData((p) => ({ ...p, hourTaken: diff, endDate: p.startDate }));
  }, [mode, startTime, endTime]);

  // day modes => minutes = days * workMinutesPerDay
  useEffect(() => {
    if (mode === "hours") return;
    const end = mode === "multi-day" ? formData.endDate : formData.startDate;
    const days = mode === "multi-day" ? computeDays(formData.startDate, end) : 1;
    setFormData((p) => ({ ...p, hourTaken: days * workMinutesPerDay }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, formData.startDate, formData.endDate, workMinutesPerDay]);

  const handleChange = (field: keyof InsertPermiso, value: any) => {
    setFormData((p) => ({ ...p, [field]: value }));
  };

  // Saldo
  const availableVacationMin = useMemo(() => Number(timeBalance?.vacationAvailableMin ?? 0), [timeBalance]);
  const requestedMin = useMemo(() => Number(formData.hourTaken ?? 0), [formData.hourTaken]);

  const insufficientBalance = useMemo(() => {
    if (!selectedType?.deductsFromVacation) return false;
    if (!timeBalance) return false;
    return requestedMin > availableVacationMin;
  }, [selectedType?.deductsFromVacation, timeBalance, requestedMin, availableVacationMin]);

  // Validaciones (cruces)
  useEffect(() => {
    const reqStart = formData.startDate;
    const reqEnd = mode === "multi-day" ? formData.endDate : formData.startDate;

    if (reqStart < today) return setErrorMsg("No se permiten fechas anteriores a hoy.");
    if (mode === "multi-day" && reqEnd < reqStart) return setErrorMsg("La fecha fin no puede ser menor a la fecha inicio.");

    if (mode === "hours") {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) return setErrorMsg("La hora fin debe ser mayor que la hora inicio.");
    }

    // NO CRUCE con permisos activos (cualquier tipo)
    const overlapsAnyPerm = (existingPerms || []).some((p: any) => {
      const otherId = p?.permissionId ?? p?.PermissionId ?? p?.id ?? p?.ID;
      if (editingId != null && String(otherId) === String(editingId)) return false;
      if (!isActivePermission(p?.status)) return false;

      const os = dateOnly(p?.startDate);
      const oe = dateOnly(p?.endDate ?? p?.startDate);
      return rangesOverlap(reqStart, reqEnd, os, oe);
    });

    if (overlapsAnyPerm) {
      return setErrorMsg(
        mode === "hours"
          ? "Ya existe un permiso activo en ese día (no se permiten cruces)."
          : "El rango se traslapa con otro permiso activo (no se permiten cruces)."
      );
    }

    // NO CRUCE con vacaciones activas
    const overlapsVacs = (existingVacs || []).some((v: any) => {
      if (!isActiveVacation(v?.status)) return false;
      const os = dateOnly(v?.startDate);
      const oe = dateOnly(v?.endDate ?? v?.startDate);
      return rangesOverlap(reqStart, reqEnd, os, oe);
    });

    if (overlapsVacs) return setErrorMsg("El rango se traslapa con vacaciones activas (no se permiten cruces).");

    // maxDays
    if (selectedType?.maxDays && mode !== "hours") {
      const daysCount = mode === "full-day" ? 1 : computeDays(formData.startDate, formData.endDate);
      if (daysCount > selectedType.maxDays) return setErrorMsg("El rango excede el máximo de días permitido para este tipo.");
    }

    // saldo
    if (selectedType?.deductsFromVacation && timeBalance) {
      const available = Number(timeBalance.vacationAvailableMin ?? 0);
      const requested = Number(formData.hourTaken ?? 0);
      if (requested > available) {
        return setErrorMsg(`Saldo insuficiente. Disponible: ${fmtMinutes(available)}. Solicitado: ${fmtMinutes(requested)}.`);
      }
    }

    setErrorMsg("");
  }, [
    formData.startDate,
    formData.endDate,
    formData.hourTaken,
    mode,
    startTime,
    endTime,
    existingPerms,
    existingVacs,
    selectedType,
    today,
    editingId,
    timeBalance,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (selectedType?.deductsFromVacation && timeBalance) {
        const available = Number(timeBalance.vacationAvailableMin ?? 0);
        const requested = Number(formData.hourTaken ?? 0);
        if (requested > available) {
          throw new Error(`Saldo insuficiente. Disponible: ${fmtMinutes(available)}. Solicitado: ${fmtMinutes(requested)}.`);
        }
      }

      // Si requiere docs: en CREATE exigir al menos uno
      if (requiresDocs && !isEdit) {
        const selectedCount = docManagerRef.current?.getSelectedCount?.() ?? 0;
        if (selectedCount === 0) {
          throw new Error("Este tipo requiere documentación. Selecciona al menos un archivo antes de guardar.");
        }
      }

      const payloadBase: any = {
        employeeId,
        permissionTypeId: formData.permissionTypeId,
        startDate: dateOnly(formData.startDate),
        endDate: dateOnly(mode === "multi-day" ? formData.endDate : formData.startDate),
        justification: formData.justification,
        chargedToVacation: !!formData.chargedToVacation,
        status: "Pending",
        hourTaken: Number(formData.hourTaken ?? 0),
      };

      const payload = clean(payloadBase) as InsertPermiso;

      // EDIT
      if (isEdit) {
        const upd = (PermisosAPI as any).update ?? (PermisosAPI as any).put;
        const resp =
          typeof upd === "function"
            ? await upd(editingId, payload)
            : await apiFetch<any>(`/api/v1/rh/permissions/${editingId}`, { method: "PUT", body: payload });

        if (requiresDocs) {
          const selectedCount = docManagerRef.current?.getSelectedCount?.() ?? 0;
          if (selectedCount > 0) {
            const result = await docManagerRef.current?.uploadAll(String(editingId));
            await docManagerRef.current?.refresh(String(editingId));
            if (!result?.success) throw new Error(result?.message ?? "Permiso actualizado, pero la carga de documentos falló.");
            docManagerRef.current?.clearSelected();
          }
        }

        return resp;
      }

      // CREATE
      const createdResp = await PermisosAPI.create(payload);

      if (requiresDocs) {
        const createdId = extractPermissionId(createdResp);
        if (!createdId) throw new Error("El backend no devolvió el ID del permiso creado (permissionId).");

        const result = await docManagerRef.current?.uploadAll(createdId);
        await docManagerRef.current?.refresh(createdId);

        if (!result?.success) throw new Error(result?.message ?? "Permiso creado, pero la carga de documentos falló.");

        docManagerRef.current?.clearSelected();
      }

      return createdResp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId] });
      onSuccess(isEdit);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message ?? "No se pudo guardar.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errorMsg) return;
    if (!formData.permissionTypeId) {
      setErrorMsg("Seleccione un tipo de permiso.");
      return;
    }
    if (insufficientBalance) return;
    mutation.mutate();
  };

  const headerInfo = useMemo(() => {
    if (!selectedType) return null;
    return (
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
        <div>• {selectedType.deductsFromVacation ? "Descuenta" : "No descuenta"} de vacaciones</div>
        {selectedType.maxDays ? <div>• Máx. días: {selectedType.maxDays}</div> : null}
        <div>• {selectedType.requiresApproval ? "Requiere aprobación" : "No requiere aprobación"}</div>
        <div>• {requiresDocs ? "Requiere documentación" : "No requiere documentación"}</div>
      </div>
    );
  }, [selectedType, requiresDocs]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(errorMsg || insufficientBalance) && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg || "Saldo insuficiente para el tiempo solicitado."}
        </div>
      )}

      {selectedType?.deductsFromVacation && timeBalance && (
        <div className="rounded-xl border bg-card p-3 text-sm">
          <div className="grid grid-cols-1 gap-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Saldo vacaciones disponible</span>
              <span className="font-medium">{fmtMinutes(timeBalance.vacationAvailableMin)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Solicitado (calculado)</span>
              <span className={`font-medium ${insufficientBalance ? "text-red-600" : ""}`}>{fmtMinutes(formData.hourTaken)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Recuperación pendiente</span>
              <span className="font-medium">{fmtMinutes(timeBalance.recoveryPendingMin)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="permissionType">Tipo de Permiso</Label>
          <Select
            value={String(formData.permissionTypeId || "")}
            onValueChange={(v) => handleChange("permissionTypeId", parseInt(v, 10))}
            disabled={typesLoading}
          >
            <SelectTrigger id="permissionType" aria-label="Tipo de permiso">
              <SelectValue placeholder={typesLoading ? "Cargando tipos..." : "Seleccionar tipo"} />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.typeId} value={String(t.typeId)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {headerInfo}
        </div>

        <div>
          <Label htmlFor="mode">Modo</Label>
          <Select value={mode} onValueChange={(v: RangeMode) => setMode(v)}>
            <SelectTrigger id="mode" aria-label="Modo del permiso">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Fecha Inicio</Label>
          <Input id="startDate" type="date" min={today} value={formData.startDate} onChange={(e) => handleChange("startDate", e.target.value)} required />
        </div>

        {mode === "multi-day" ? (
          <div>
            <Label htmlFor="endDate">Fecha Fin</Label>
            <Input id="endDate" type="date" min={formData.startDate} value={formData.endDate} onChange={(e) => handleChange("endDate", e.target.value)} required />
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={!!formData.chargedToVacation}
              onCheckedChange={(v) => handleChange("chargedToVacation", v)}
              id="chargedToVacation"
              disabled={!!selectedType}
            />
            <Label htmlFor="chargedToVacation">Descontar de vacaciones {selectedType ? "(definido por el tipo)" : ""}</Label>
          </div>
        )}
      </div>

      {mode === "hours" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="startTime">Hora desde</Label>
            <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="endTime">Hora hasta</Label>
            <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div>
            <Label>Minutos calculados</Label>
            <Input value={fmtMinutes(formData.hourTaken)} readOnly />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="justification">Justificación</Label>
        <Textarea
          id="justification"
          value={formData.justification}
          onChange={(e) => handleChange("justification", e.target.value)}
          placeholder="Describa el motivo del permiso…"
          rows={3}
        />
      </div>

      {requiresDocs && (
        <div className="rounded-xl border bg-card p-3 space-y-2">
          <div className="text-sm font-medium">Documentación</div>

          <ReusableDocumentManager
            ref={docManagerRef}
            label="Anexar documentos"
            directoryCode={documents.directoryCode}
            entityType={documents.entityType}
            relativePath={documents.relativePath}
            accept={documents.accept ?? ".pdf"}
            maxSizeMB={documents.maxSizeMB ?? 25}
            maxFiles={documents.maxFiles ?? 10}
            documentType={documents.documentType ?? { enabled: true, required: true }}

            entityId={isEdit ? String(editingId) : undefined}
            entityReady={isEdit}
            allowSelectWhenNotReady={true}
            showInternalUploadButton={false}
            disabled={mutation.isPending}
            roles={{ canUpload: true, canPreview: true, canDownload: true, canDelete: true }}
          />

          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              Selecciona los archivos antes de guardar; se subirán automáticamente al crear el permiso.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!!errorMsg || insufficientBalance || mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Solicitar Permiso"}
        </Button>
      </div>
    </form>
  );
}
