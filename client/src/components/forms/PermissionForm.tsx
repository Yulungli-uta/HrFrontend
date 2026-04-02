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
  ParametersAPI,
  type ApiResponse,
  apiFetch,
} from "@/lib/api";

import type { InsertPermiso } from "@/shared/schema";

type PermissionFormData = {
  employeeId: number;
  permissionTypeId: number;
  startDate: string;
  endDate: string;
  requestDate: string;
  justification: string;
  status: string;
  approvedBy: number | null;
  approvedAt: string | null;
  chargedToVacation: boolean;
  hourTaken: number;
  vacationId: number | null;
};
import { useAuth } from "@/contexts/AuthContext";

import {
  ReusableDocumentManager,
  type ReusableDocumentManagerHandle,
} from "@/components/ReusableDocumentManager";
import { parseApiError } from "@/lib/error-handling";

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
  ["rejected", "rechazado", "canceled", "cancelled", "cancelado", "anulado", "anulada", "annulled", "void"].includes(
    normStatus(s)
  );

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

const safeInt = (v: any, fallback = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
};

const safeMinutes = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
  return Math.max(0, Math.trunc(n));
};

const safeHours = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
  return Math.max(0, Math.trunc(n));
};

// Extrae "HH:mm" de un string ISO o "YYYY-MM-DDTHH:mm:ss"
const timeHHmmFromISO = (s?: any) => {
  if (!s) return null;
  const str = String(s);
  const parts = str.split("T");
  if (parts.length < 2) return null;
  const timePart = parts[1];
  const hhmm = timePart.slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  return hhmm;
};

// Arma "YYYY-MM-DDTHH:mm:00" (sin zona) para evitar offsets raros
const buildLocalDateTime = (date: string, timeHHmm: string) => {
  const d = dateOnly(date);
  const t = (timeHHmm || "00:00").slice(0, 5);
  return `${d}T${t}:00`;
};

const addHours = (date: Date, hours: number) => {
  const d = new Date(date);
  d.setHours(d.getHours() + Math.max(0, Math.trunc(hours)));
  return d;
};

const startOfDay = (dateStr: string) => {
  return new Date(`${dateOnly(dateStr)}T00:00:00`);
};

const buildDateTime = (dateStr: string, timeHHmm = "00:00") => {
  return new Date(`${dateOnly(dateStr)}T${timeHHmm}:00`);
};

const fmtDateTime = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

type RangeMode = "full-day" | "multi-day" | "hours";

type PermissionType = {
  typeId: number;
  name: string;
  deductsFromVacation: boolean;
  requiresApproval: boolean;
  maxDays?: number | null;
  leadTimeHours?: number | null;

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
  workMinutesPerDay: number;
}

export default function PermissionForm({
  onSuccess,
  onCancel,
  initialPermission = null,
  timeBalance = null,
  documents,
  workMinutesPerDay: workMinutesPerDayProp,
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

  // -----------------------
  // Param: WORK_MINUTES_PER_DAY
  // -----------------------
  const { data: paramResp } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/cv/parameters", "name", "WORK_MINUTES_PER_DAY"],
    queryFn: () => ParametersAPI.getByName("WORK_MINUTES_PER_DAY"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const workMinutesPerDayFromApi = useMemo(() => {
    if (paramResp?.status !== "success") return null;

    const raw =
      paramResp?.data?.value ??
      paramResp?.data?.Value ??
      paramResp?.data?.parameterValue ??
      paramResp?.data?.ParameterValue ??
      paramResp?.data?.valor ??
      paramResp?.data?.Valor ??
      paramResp?.data?.data?.value ??
      null;

    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.trunc(n);
  }, [paramResp]);

  const effectiveWorkMinutesPerDay = useMemo(() => {
    if (workMinutesPerDayFromApi && workMinutesPerDayFromApi > 0) return workMinutesPerDayFromApi;

    const propN = Number(workMinutesPerDayProp);
    if (Number.isFinite(propN) && propN > 0) return Math.trunc(propN);

    return 480;
  }, [workMinutesPerDayFromApi, workMinutesPerDayProp]);

  // -----------------------
  // Types
  // -----------------------
  const { data: typesResp, isLoading: typesLoading } = useQuery<ApiResponse<PermissionType[]>>({
    queryKey: ["/api/v1/rh/permission-types"],
    queryFn: () => TiposPermisosAPI.list(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const types = useMemo(
    () => (typesResp?.status === "success" ? typesResp.data || [] : []),
    [typesResp]
  );

  const typeMap = useMemo(() => new Map(types.map((t) => [t.typeId, t])), [types]);

  // Existing perms/vacs
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

  const existingPerms = useMemo(
    () => (permsResp?.status === "success" ? permsResp.data || [] : []),
    [permsResp]
  );

  const existingVacs = useMemo(
    () => (vacsResp?.status === "success" ? vacsResp.data || [] : []),
    [vacsResp]
  );

  // Defaults
  const defaults = useMemo<PermissionFormData>(() => {
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

  const [formData, setFormData] = useState<PermissionFormData>(defaults);

  useEffect(() => {
    if (employeeId) {
      setFormData((p) => {
        if (p.employeeId === employeeId) return p;
        return { ...p, employeeId };
      });
    }
  }, [employeeId]);

  // Resolver tipo al editar
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

    const rawS = initialPermission?.startDate ?? initialPermission?.StartDate;
    const rawE = initialPermission?.endDate ?? initialPermission?.EndDate ?? rawS;

    const sd = rawS ? dateOnly(String(rawS)) : today;
    const ed = rawE ? dateOnly(String(rawE)) : sd;

    const hourTaken = safeMinutes(initialPermission?.hourTaken ?? initialPermission?.HourTaken ?? 0);

    const st = timeHHmmFromISO(rawS);
    const et = timeHHmmFromISO(rawE);

    if (sd !== ed) {
      setMode("multi-day");
    } else if ((st && et && st !== et) || (hourTaken > 0 && hourTaken < effectiveWorkMinutesPerDay)) {
      setMode("hours");
    } else {
      setMode("full-day");
    }

    if (st) setStartTime(st);
    if (et) setEndTime(et);

    setFormData((prev) => ({
      ...defaults,
      ...prev,
      permissionTypeId: resolvedInitialTypeId || prev.permissionTypeId,
      startDate: sd,
      endDate: ed,
      justification: String(initialPermission?.justification ?? initialPermission?.Justification ?? ""),
      chargedToVacation: Boolean(
        initialPermission?.chargedToVacation ?? initialPermission?.ChargedToVacation ?? false
      ),
      status: String(initialPermission?.status ?? initialPermission?.Status ?? "Pending"),
      hourTaken,
    }));

    setErrorMsg("");
    docManagerRef.current?.clearSelected();
  }, [initialPermission, defaults, today, resolvedInitialTypeId, effectiveWorkMinutesPerDay]);

  // Set default type para create
  useEffect(() => {
    if (!initialPermission && types.length && !formData.permissionTypeId) {
      setFormData((p) => ({ ...p, permissionTypeId: types[0].typeId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, initialPermission]);

  const selectedType = useMemo(
    () => typeMap.get(formData.permissionTypeId || 0),
    [typeMap, formData.permissionTypeId]
  );

  useEffect(() => {
    if (!selectedType) return;
    setFormData((p) => {
      const next = !!selectedType.deductsFromVacation;
      if (p.chargedToVacation === next) return p;
      return { ...p, chargedToVacation: next };
    });
  }, [selectedType]);

  const requiresDocs = useMemo(() => {
    if (!selectedType) return false;
    return toBool(
      selectedType.AttachedFile ??
        selectedType.attachedFile ??
        selectedType.requiresDocumentation ??
        false
    );
  }, [selectedType]);

  const selectedLeadTimeHours = useMemo(() => {
    if (!selectedType) return 0;
    return safeHours(selectedType.leadTimeHours ?? 0);
  }, [selectedType]);

  useEffect(() => {
    if (!requiresDocs) docManagerRef.current?.clearSelected();
  }, [requiresDocs]);

  useEffect(() => {
    if (!isEdit) return;
    if (!requiresDocs) return;
    if (!editingId) return;
    docManagerRef.current?.refresh(String(editingId));
  }, [isEdit, requiresDocs, editingId]);

  const computeDays = (s: string, e: string) => {
    const ds = toDate(s).getTime();
    const de = toDate(e).getTime();
    if (!Number.isFinite(ds) || !Number.isFinite(de)) return 0;
    return Math.max(0, Math.floor((de - ds) / 86400000) + 1);
  };

  // -----------------------
  // hourTaken derivado
  // -----------------------
  const computedHourTaken = useMemo(() => {
    if (mode === "hours") {
      const [sh, sm] = startTime.split(":").map((x) => safeInt(x, 0));
      const [eh, em] = endTime.split(":").map((x) => safeInt(x, 0));
      const diff = eh * 60 + em - (sh * 60 + sm);
      return safeMinutes(diff);
    }

    if (mode === "multi-day") {
      const days = computeDays(formData.startDate, formData.endDate);
      return safeMinutes(days * effectiveWorkMinutesPerDay);
    }

    return safeMinutes(1 * effectiveWorkMinutesPerDay);
  }, [mode, startTime, endTime, formData.startDate, formData.endDate, effectiveWorkMinutesPerDay]);

  useEffect(() => {
    setFormData((p) => {
      const nextEndDate = mode === "multi-day" ? p.endDate : p.startDate;
      if (p.hourTaken === computedHourTaken && p.endDate === nextEndDate) return p;
      return { ...p, hourTaken: computedHourTaken, endDate: nextEndDate };
    });
  }, [computedHourTaken, mode]);

  const handleChange = (field: keyof PermissionFormData, value: any) => {
    setFormData((p) => ({ ...p, [field]: value }));
  };

  const availableVacationMin = useMemo(
    () => Number(timeBalance?.vacationAvailableMin ?? 0),
    [timeBalance]
  );

  const requestedMin = useMemo(
    () => safeMinutes(computedHourTaken),
    [computedHourTaken]
  );

  const insufficientBalance = useMemo(() => {
    if (!selectedType?.deductsFromVacation) return false;
    if (!timeBalance) return false;
    return requestedMin > availableVacationMin;
  }, [selectedType?.deductsFromVacation, timeBalance, requestedMin, availableVacationMin]);

  // Validaciones
  useEffect(() => {
    const reqStart = formData.startDate;
    const reqEnd = mode === "multi-day" ? formData.endDate : formData.startDate;

    if (reqStart < today) {
      setErrorMsg("No se permiten fechas anteriores a hoy.");
      return;
    }

    if (mode === "multi-day" && reqEnd < reqStart) {
      setErrorMsg("La fecha fin no puede ser menor a la fecha inicio.");
      return;
    }

    if (mode === "hours") {
      const [sh, sm] = startTime.split(":").map((x) => safeInt(x, 0));
      const [eh, em] = endTime.split(":").map((x) => safeInt(x, 0));
      if (eh * 60 + em <= sh * 60 + sm) {
        setErrorMsg("La hora fin debe ser mayor que la hora inicio.");
        return;
      }
    }

    // leadTimeHours
    if (selectedLeadTimeHours > 0) {
      const now = new Date();
      const minAllowedDateTime = addHours(now, selectedLeadTimeHours);

      const requestedStart =
        mode === "hours"
          ? buildDateTime(formData.startDate, startTime)
          : startOfDay(formData.startDate);

      if (requestedStart < minAllowedDateTime) {
        setErrorMsg(
          `Este tipo de permiso requiere al menos ${selectedLeadTimeHours} hora(s) de anticipación. ` +
            `Puedes solicitarlo desde ${fmtDateTime(minAllowedDateTime)} en adelante.`
        );
        return;
      }
    }

    const overlapsAnyPerm = (existingPerms || []).some((p: any) => {
      const otherId = p?.permissionId ?? p?.PermissionId ?? p?.id ?? p?.ID;
      if (editingId != null && String(otherId) === String(editingId)) return false;
      if (!isActivePermission(p?.status)) return false;

      const os = dateOnly(p?.startDate);
      const oe = dateOnly(p?.endDate ?? p?.startDate);
      return rangesOverlap(reqStart, reqEnd, os, oe);
    });

    if (overlapsAnyPerm) {
      setErrorMsg(
        mode === "hours"
          ? "Ya existe un permiso activo en ese día (no se permiten cruces)."
          : "El rango se traslapa con otro permiso activo (no se permiten cruces)."
      );
      return;
    }

    const overlapsVacs = (existingVacs || []).some((v: any) => {
      if (!isActiveVacation(v?.status)) return false;
      const os = dateOnly(v?.startDate);
      const oe = dateOnly(v?.endDate ?? v?.startDate);
      return rangesOverlap(reqStart, reqEnd, os, oe);
    });

    if (overlapsVacs) {
      setErrorMsg("El rango se traslapa con vacaciones activas (no se permiten cruces).");
      return;
    }

    if (selectedType?.maxDays && mode !== "hours") {
      const daysCount = mode === "full-day" ? 1 : computeDays(formData.startDate, formData.endDate);
      if (daysCount > selectedType.maxDays) {
        setErrorMsg("El rango excede el máximo de días permitido para este tipo.");
        return;
      }
    }

    if (selectedType?.deductsFromVacation && timeBalance) {
      const available = Number(timeBalance.vacationAvailableMin ?? 0);
      const requested = safeMinutes(computedHourTaken);
      if (requested > available) {
        setErrorMsg(
          `Saldo insuficiente. Disponible: ${fmtMinutes(available)}. Solicitado: ${fmtMinutes(requested)}.`
        );
        return;
      }
    }

    setErrorMsg("");
  }, [
    formData.startDate,
    formData.endDate,
    mode,
    startTime,
    endTime,
    existingPerms,
    existingVacs,
    selectedType,
    selectedLeadTimeHours,
    today,
    editingId,
    timeBalance,
    computedHourTaken,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (selectedType?.deductsFromVacation && timeBalance) {
        const available = Number(timeBalance.vacationAvailableMin ?? 0);
        const requested = safeMinutes(computedHourTaken);
        if (requested > available) {
          throw new Error(
            `Saldo insuficiente. Disponible: ${fmtMinutes(available)}. Solicitado: ${fmtMinutes(requested)}.`
          );
        }
      }

      if (requiresDocs && !isEdit) {
        const selectedCount = docManagerRef.current?.getSelectedCount?.() ?? 0;
        if (selectedCount === 0) {
          throw new Error("Este tipo requiere documentación. Selecciona al menos un archivo antes de guardar.");
        }
      }

      const minutesToSend = safeMinutes(computedHourTaken);

      const payloadStartDate =
        mode === "hours"
          ? buildLocalDateTime(formData.startDate, startTime)
          : dateOnly(formData.startDate);

      const payloadEndDate =
        mode === "hours"
          ? buildLocalDateTime(formData.startDate, endTime)
          : dateOnly(mode === "multi-day" ? formData.endDate : formData.startDate);

      const payloadBase: any = {
        employeeId,
        permissionTypeId: formData.permissionTypeId,
        startDate: payloadStartDate,
        endDate: payloadEndDate,
        justification: formData.justification,
        chargedToVacation: !!formData.chargedToVacation,
        status: "Pending",
        hourTaken: minutesToSend,
      };

      const payload = clean(payloadBase) as InsertPermiso;

      if (isEdit) {
        const upd = (PermisosAPI as any).update ?? (PermisosAPI as any).put;
        const resp =
          typeof upd === "function"
            ? await upd(editingId, payload)
            : await apiFetch<any>(`/api/v1/rh/permissions/${editingId}`, { method: "PUT", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });

        if (requiresDocs) {
          const selectedCount = docManagerRef.current?.getSelectedCount?.() ?? 0;
          if (selectedCount > 0) {
            const result = await docManagerRef.current?.uploadAll(String(editingId));
            await docManagerRef.current?.refresh(String(editingId));
            if (!result?.success) {
              throw new Error(result?.message ?? "Permiso actualizado, pero la carga de documentos falló.");
            }
            docManagerRef.current?.clearSelected();
          }
        }

        return resp;
      }

      const createdResp = await PermisosAPI.create(payload);

      if (requiresDocs) {
        const createdId = extractPermissionId(createdResp);
        if (!createdId) {
          throw new Error("El backend no devolvió el ID del permiso creado (permissionId).");
        }

        const result = await docManagerRef.current?.uploadAll(createdId);
        await docManagerRef.current?.refresh(createdId);

        if (!result?.success) {
          throw new Error(result?.message ?? "Permiso creado, pero la carga de documentos falló.");
        }

        docManagerRef.current?.clearSelected();
      }

      return createdResp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId] });
      onSuccess(isEdit);
    },
    onError: (err: unknown) => {
      setErrorMsg(parseApiError(err).message);
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
        <div>• Anticipación mínima: {selectedLeadTimeHours} horas</div>
        <div>• Minutos laborables por día: {effectiveWorkMinutesPerDay}</div>
      </div>
    );
  }, [selectedType, requiresDocs, selectedLeadTimeHours, effectiveWorkMinutesPerDay]);

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
              <span className={`font-medium ${insufficientBalance ? "text-red-600" : ""}`}>
                {fmtMinutes(computedHourTaken)}
              </span>
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
          <Input
            id="startDate"
            type="date"
            min={today}
            value={formData.startDate ?? ""}
            onChange={(e) => handleChange("startDate", e.target.value)}
            required
          />
        </div>

        {mode === "multi-day" ? (
          <div>
            <Label htmlFor="endDate">Fecha Fin</Label>
            <Input
              id="endDate"
              type="date"
              min={formData.startDate ?? today}
              value={formData.endDate ?? ""}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="startTime">Hora desde</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endTime">Hora hasta</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div>
            <Label>Minutos calculados</Label>
            <Input value={fmtMinutes(computedHourTaken)} readOnly />
          </div>
        </div>
      )}

      {mode !== "hours" && (
        <div className="grid grid-cols-1 gap-2">
          <div className="text-xs text-muted-foreground">
            Minutos calculados: <span className="font-medium">{fmtMinutes(computedHourTaken)}</span>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="justification">Justificación</Label>
        <Textarea
          id="justification"
          value={formData.justification ?? ""}
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
        <Button
          type="submit"
          disabled={!!errorMsg || insufficientBalance || mutation.isPending}
          className="w-full sm:w-auto"
        >
          {mutation.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Solicitar Permiso"}
        </Button>
      </div>
    </form>
  );
}