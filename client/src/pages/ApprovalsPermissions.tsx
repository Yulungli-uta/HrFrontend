// src/pages/ApprovalsPermissions.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  PermisosAPI,
  VacacionesAPI,
  TiposPermisosAPI,
  VistaDetallesEmpleadosAPI,
  JustificationsAPI, // <-- requiere export en lib/api
  handleApiError,
} from "@/lib/api";
import {
  CalendarCheck,
  Sun,
  Search,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";

/* -------------------- Tipos de dominio -------------------- */
interface Permission {
  id?: number;
  employeeId?: number;
  permissionTypeId?: number;
  startDate?: string;
  endDate?: string;
  justification?: string;
  status?: "Pending" | "Approved" | "Rejected";
  requestDate?: string;
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: number;
  RowVersion?: string;
  chargedToVacation?: boolean;
  vacationId?: number;
  hourTaken?: number;
}

interface Vacation {
  VacationID?: number;
  EmployeeID?: number;
  StartDate?: string;
  EndDate?: string;
  DaysGranted?: number;
  DaysTaken?: number;
  Status?: "Planned" | "InProgress" | "Completed" | "Canceled";
  Reason?: string;
  ApprovedBy?: number;
  ApprovedAt?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  RowVersion?: string;
}

interface PermissionType { id: number; name: string; }
interface EmployeeLite { employeeID: number; fullName: string; departmentName?: string; }

type JustStatus = "PENDING" | "APPROVED" | "REJECTED";
interface Justification {
  punchJustId?: number;
  employeeId?: number;
  bossEmployeeId?: number;
  justificationTypeId?: number;
  startDate?: string | null;
  endDate?: string | null;
  justificationDate?: string | null;
  reason?: string | null;
  hoursRequested?: number | null;
  approved?: boolean;
  createdAt?: string | null;
  createdBy?: number | null;
  comments?: string | null;
  status?: JustStatus | string | null;
}

/* -------------------- Helpers genéricos -------------------- */
const statusChip: Record<string, { label: string; color: string; icon: any }> = {
  Pending:   { label: "Pendiente",  color: "bg-yellow-100 text-yellow-800", icon: Clock },
  Approved:  { label: "Aprobado",   color: "bg-green-100 text-green-800",  icon: CheckCircle },
  Rejected:  { label: "Rechazado",  color: "bg-red-100 text-red-800",      icon: XCircle },
  Planned:   { label: "Planeado",   color: "bg-yellow-100 text-yellow-800", icon: Clock },
  InProgress:{ label: "En Proceso", color: "bg-blue-100 text-blue-800",    icon: AlertCircle },
  Completed: { label: "Completado", color: "bg-green-100 text-green-800",  icon: CheckCircle },
  Canceled:  { label: "Cancelado",  color: "bg-red-100 text-red-800",      icon: XCircle },
  PENDING:   { label: "Pendiente",  color: "bg-yellow-100 text-yellow-800", icon: Clock },
  APPROVED:  { label: "Aprobada",   color: "bg-green-100 text-green-800",  icon: CheckCircle },
  REJECTED:  { label: "Rechazada",  color: "bg-red-100 text-red-800",      icon: XCircle },
};

const fmtDate = (s?: string | null) => {
  const d = parseDateSafe(s ?? undefined);
  return d ? d.toLocaleDateString("es-ES") : "—";
};
const yearOf = (s?: string | null) => {
  const d = parseDateSafe(s ?? undefined);
  return d ? d.getFullYear() : -1;
};
const currentYear = new Date().getFullYear();

const safeArray = (data: any): any[] =>
  Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.results) ? data.results : [];

const pick = (obj: any, names: string[]) => {
  for (const n of names) if (obj?.[n] !== undefined && obj?.[n] !== null) return obj[n];
  return undefined;
};

const toNumber = (v: any) => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

/* === STATUS canónico Permisos === */
const statusFromCode = (code: number): "Pending" | "Approved" | "Rejected" => {
  if (code === 2) return "Approved";
  if (code === 3) return "Rejected";
  return "Pending";
};
const canonicalPermissionStatus = (s?: string | number): "Pending" | "Approved" | "Rejected" => {
  if (s === undefined || s === null) return "Pending";
  if (typeof s === "number") return statusFromCode(s);
  const val = String(s).trim().toLowerCase();
  if (val.includes("pend")) return "Pending";
  if (val.includes("aprob") || val.includes("approv")) return "Approved";
  if (val.includes("rech") || val.includes("reject")) return "Rejected";
  if (val === "pending") return "Pending";
  if (val === "approved") return "Approved";
  if (val === "rejected") return "Rejected";
  return "Pending";
};

/* === Parser de fechas robusto === */
function parseDateSafe(s?: string): Date | null {
  if (!s) return null;
  const m = /\/Date\((\d+)\)\//.exec(s);
  if (m) {
    const d = new Date(Number(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  let str = s.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(str)) {
    str = str.replace(" ", "T");
  }
  const d1 = new Date(str);
  if (!isNaN(d1.getTime())) return d1;
  const only = str.split("T")[0];
  const d2 = new Date(only);
  return isNaN(d2.getTime()) ? null : d2;
}

const normalizeVacStatus = (s: any): Vacation["Status"] => {
  const val = String(s ?? "").toLowerCase();
  if (["planned", "planeado", "planeada"].includes(val)) return "Planned";
  if (["inprogress", "enproceso", "en proceso"].includes(val)) return "InProgress";
  if (["completed", "completado", "completada"].includes(val)) return "Completed";
  if (["canceled", "cancelado", "cancelada"].includes(val)) return "Canceled";
  return undefined;
};

const normalizePermissionType = (t: any): PermissionType => ({
  id: toNumber(pick(t, ["id", "Id", "ID", "typeId", "TypeId", "TypeID"]))!,
  name: pick(t, ["name", "Name"]) ?? "—",
});

/* -------- Normalizadores -------- */
const normalizePermission = (p: any): Permission => {
  const id = toNumber(pick(p, ["id","Id","ID","permissionId","PermissionId","PermissionID","permissionID","permission_id"]));
  return {
    id,
    employeeId: toNumber(pick(p, ["employeeId","EmployeeID","employeeID","EmployeeId","employee_id"])),
    permissionTypeId: toNumber(pick(p, ["permissionTypeId","PermissionTypeID","PermissionTypeId","permission_type_id"])),
    startDate: pick(p, ["startDate","StartDate","start_date"]),
    endDate: pick(p, ["endDate","EndDate","end_date"]),
    justification: pick(p, ["justification","Justification"]),
    status: canonicalPermissionStatus(pick(p, ["status","Status"])),
    requestDate: pick(p, ["requestDate","RequestDate","createdAt","CreatedAt"]),
    createdAt: pick(p, ["createdAt","CreatedAt"]),
    approvedAt: pick(p, ["approvedAt","ApprovedAt"]),
    approvedBy: toNumber(pick(p, ["approvedBy","ApprovedBy"])),
    RowVersion: pick(p, ["RowVersion","rowVersion","row_version"]),
    chargedToVacation: !!pick(p, ["chargedToVacation","ChargedToVacation"]),
    vacationId: toNumber(pick(p, ["VacationID","vacationID","vacationId"])),
    hourTaken: toNumber(pick(p, ["hourTaken","HourTaken"])) ?? 0,
  };
};

const normalizeVacation = (v: any): Vacation => ({
  VacationID: toNumber(pick(v, ["VacationID", "vacationID", "vacationId", "id", "Id", "ID"])),
  EmployeeID: toNumber(pick(v, ["EmployeeID", "employeeID", "employeeId"])),
  StartDate: pick(v, ["StartDate", "startDate", "start_date"]),
  EndDate: pick(v, ["EndDate", "endDate", "end_date"]),
  DaysGranted: toNumber(pick(v, ["DaysGranted", "daysGranted", "totalDays"])),
  DaysTaken: toNumber(pick(v, ["DaysTaken", "daysTaken"])),
  Status: normalizeVacStatus(pick(v, ["Status", "status"])),
  Reason: pick(v, ["Reason", "reason"]),
  ApprovedBy: toNumber(pick(v, ["ApprovedBy","approvedBy"])),
  ApprovedAt: pick(v, ["ApprovedAt","approvedAt"]),
  CreatedAt: pick(v, ["CreatedAt","createdAt"]),
  UpdatedAt: pick(v, ["UpdatedAt","updatedAt"]),
  RowVersion: pick(v, ["RowVersion", "rowVersion", "row_version"]),
});

const normalizeJustStatus = (s: any): JustStatus => {
  const v = String(s ?? "").toUpperCase();
  if (v.includes("APPROV")) return "APPROVED";
  if (v.includes("REJECT")) return "REJECTED";
  return "PENDING";
};

const normalizeJustification = (j: any): Justification => ({
  punchJustId: toNumber(pick(j, ["punchJustId","id","Id","ID"])),
  employeeId: toNumber(pick(j, ["employeeId","EmployeeID","employeeID"])),
  bossEmployeeId: toNumber(pick(j, ["bossEmployeeId","BossEmployeeID","bossId"])),
  justificationTypeId: toNumber(pick(j, ["justificationTypeId","JustificationTypeID"])),
  startDate: pick(j, ["startDate","StartDate"]) ?? null,
  endDate: pick(j, ["endDate","EndDate"]) ?? null,
  justificationDate: pick(j, ["justificationDate","JustificationDate"]) ?? null,
  reason: pick(j, ["reason","Reason"]) ?? null,
  hoursRequested: toNumber(pick(j, ["hoursRequested","HoursRequested"])) ?? null,
  approved: Boolean(pick(j, ["approved","Approved"])) ?? false,
  createdAt: pick(j, ["createdAt","CreatedAt"]) ?? null,
  createdBy: toNumber(pick(j, ["createdBy","CreatedBy"])) ?? null,
  comments: pick(j, ["comments","Comments"]) ?? null,
  status: normalizeJustStatus(pick(j, ["status","Status"])),
});

/* -------- Keys únicas -------- */
const getPermissionKey = (p: Permission, i: number) =>
  `perm-${p.id ?? `${p.employeeId}-${p.startDate}-${p.endDate}-${p.requestDate ?? ""}-${i}`}`;

const getVacationKey = (v: Vacation, i: number) =>
  `vac-${v.VacationID ?? `${v.EmployeeID}-${v.StartDate}-${v.EndDate}-${v.CreatedAt ?? ""}-${i}`}`;

const getJustKey = (j: Justification, i: number) =>
  `just-${j.punchJustId ?? `${j.employeeId}-${j.justificationDate ?? j.startDate ?? ""}-${i}`}`;

const onlyDate = (s?: string | null) => (s ? String(s).split("T")[0] : undefined);

// strip undefined/null/empty
const stripEmpty = (o: Record<string, any>) => {
  const c: Record<string, any> = {};
  Object.entries(o).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    c[k] = v;
  });
  return c;
};

const asValidFkId = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/* -------------------- Página -------------------- */
export default function ApprovalsPermissions() {
  const { toast } = useToast();
  const { employeeDetails } = useAuth();
  const qc = useQueryClient();
  const approverId = employeeDetails?.employeeID;

  /* --------- Datos base (tipos y empleados) --------- */
  const { data: typesRes } = useQuery({
    queryKey: ["/api/v1/rh/permission-types"],
    queryFn: () => TiposPermisosAPI.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: employeesRes } = useQuery({
    queryKey: ["/api/v1/rh/vw/EmployeeDetails"],
    queryFn: () => VistaDetallesEmpleadosAPI.list(),
    staleTime: 5 * 60 * 1000,
  });

  const permissionTypes: PermissionType[] = useMemo(() => {
    if (typesRes?.status !== "success") return [];
    return safeArray(typesRes.data).map(normalizePermissionType).filter((t) => t.id != null);
  }, [typesRes]);

  const employeesMap: Record<number, EmployeeLite> = useMemo(() => {
    if (employeesRes?.status !== "success") return {};
    const arr = safeArray(employeesRes.data);
    const map: Record<number, EmployeeLite> = {};
    for (const r of arr) {
      const id = toNumber(pick(r, ["employeeID","EmployeeID","id","Id","ID"]));
      const fullName =
        pick(r, ["fullName","FullName"]) ??
        `${pick(r, ["firstName","FirstName"]) ?? ""} ${pick(r, ["lastName","LastName"]) ?? ""}`.trim();
      if (id != null) map[id] = { employeeID: id, fullName: fullName || `#${id}`, departmentName: pick(r, ["departmentName","DepartmentName"]) };
    }
    return map;
  }, [employeesRes]);

  const getTypeName = (id?: number) => id == null ? "—" : (permissionTypes.find(t => Number(t.id) === Number(id))?.name ?? "—");

  /* --------- Consultas por bossId (aprobador actual) --------- */
  const { data: permsRes, isLoading: loadingPerms } = useQuery({
    queryKey: ["/api/v1/rh/permissions", "boss", approverId],
    enabled: !!approverId,
    queryFn: () => PermisosAPI.getByBossId(approverId!),
  });

  const { data: vacsRes, isLoading: loadingVacs } = useQuery({
    queryKey: ["/api/v1/rh/vacations", "boss", approverId],
    enabled: !!approverId,
    queryFn: () => VacacionesAPI.getByBossId(approverId!),
  });

  const { data: justRes, isLoading: loadingJusts } = useQuery({
    queryKey: ["/api/v1/rh/cv/justifications", "boss", approverId],
    enabled: !!approverId,
    queryFn: () => JustificationsAPI.getByBossId(approverId!),
  });

  useEffect(() => {
    if (permsRes?.status === "success") {
      console.log("RAW permission sample:", safeArray(permsRes.data)[0]);
    }
  }, [permsRes]);

  const allPerms: Permission[] = permsRes?.status === "success" ? safeArray(permsRes.data).map(normalizePermission) : [];
  const allVacs: Vacation[] = vacsRes?.status === "success" ? safeArray(vacsRes.data).map(normalizeVacation) : [];
  const allJusts: Justification[] = justRes?.status === "success" ? safeArray(justRes.data).map(normalizeJustification) : [];

  /* --------- Filtros UI --------- */
  const [tab, setTab] = useState<"permisos" | "vacaciones" | "justificaciones">("permisos");

  const [permFilters, setPermFilters] = useState<{ q: string; status: "all" | "Pending" | "Approved" | "Rejected"; from?: string; to?: string; }>({ q: "", status: "all" });
  const [vacFilters, setVacFilters] = useState<{ q: string; status: "all" | "Planned" | "InProgress" | "Completed" | "Canceled"; from?: string; to?: string; }>({ q: "", status: "all" });
  const [justFilters, setJustFilters] = useState<{ q: string; status: "all" | JustStatus; from?: string; to?: string; }>({ q: "", status: "all" });

  const filteredPerms = useMemo(() => {
    return allPerms
      .filter((p) => {
        const empName = (p.employeeId && employeesMap[p.employeeId]?.fullName?.toLowerCase()) ?? "";
        const just = (p.justification ?? "").toLowerCase();
        const typeName = getTypeName(p.permissionTypeId).toLowerCase();
        const q = permFilters.q.toLowerCase();
        const textOk = !q || empName.includes(q) || just.includes(q) || typeName.includes(q);
        const canon = canonicalPermissionStatus(p.status);
        const statusOk = permFilters.status === "all" || canon === permFilters.status;
        const df = permFilters.from ? parseDateSafe(permFilters.from) : null;
        const dt = permFilters.to ? parseDateSafe(permFilters.to) : null;
        const s = parseDateSafe(p.startDate || "");
        const e = parseDateSafe(p.endDate || "");
        const fromOk = !df || (s && s >= df);
        const toOk = !dt || (e && e <= dt);
        return textOk && statusOk && fromOk && toOk;
      })
      .sort((a, b) => {
        const sa = canonicalPermissionStatus(a.status) === "Pending" ? 0 : 1;
        const sb = canonicalPermissionStatus(b.status) === "Pending" ? 0 : 1;
        return sa - sb;
      });
  }, [allPerms, permFilters, employeesMap, permissionTypes]);

  const filteredVacs = useMemo(() => {
    return allVacs.filter((v) => {
      const empName = (v.EmployeeID && employeesMap[v.EmployeeID]?.fullName?.toLowerCase()) ?? "";
      const reason = (v.Reason ?? "").toLowerCase();
      const q = vacFilters.q.toLowerCase();
      const textOk = !q || empName.includes(q) || reason.includes(q);
      const statusOk = vacFilters.status === "all" || v.Status === vacFilters.status;
      const df = vacFilters.from ? parseDateSafe(vacFilters.from) : null;
      const dt = vacFilters.to ? parseDateSafe(vacFilters.to) : null;
      const s = parseDateSafe(v.StartDate || "");
      const e = parseDateSafe(v.EndDate || "");
      const fromOk = !df || (s && s >= df);
      const toOk = !dt || (e && e <= dt);
      return textOk && statusOk && fromOk && toOk;
    }).sort((a, b) => (a.Status === "Planned" ? 0 : 1) - (b.Status === "Planned" ? 0 : 1));
  }, [allVacs, vacFilters, employeesMap]);

  const filteredJusts = useMemo(() => {
    return allJusts
      .filter((j) => {
        const empName = (j.employeeId && employeesMap[j.employeeId!]?.fullName?.toLowerCase()) ?? "";
        const reason = (j.reason ?? "").toLowerCase();
        const q = justFilters.q.toLowerCase();
        const textOk = !q || empName.includes(q) || reason.includes(q);
        const statusOk = justFilters.status === "all" || normalizeJustStatus(j.status) === justFilters.status;
        const df = justFilters.from ? parseDateSafe(justFilters.from) : null;
        const dt = justFilters.to ? parseDateSafe(justFilters.to) : null;

        const s = parseDateSafe(j.startDate ?? j.justificationDate ?? "");
        const e = parseDateSafe(j.endDate ?? j.justificationDate ?? "");
        const fromOk = !df || (s && s >= df);
        const toOk = !dt || (e && e <= dt);
        return textOk && statusOk && fromOk && toOk;
      })
      .sort((a, b) => {
        const sa = normalizeJustStatus(a.status) === "PENDING" ? 0 : 1;
        const sb = normalizeJustStatus(b.status) === "PENDING" ? 0 : 1;
        return sa - sb;
      });
  }, [allJusts, justFilters, employeesMap]);

  /* --------- Invalidate helpers --------- */
  const qcInvalidatePerms = () => qc.invalidateQueries({ queryKey: ["/api/v1/rh/permissions", "boss", approverId] });
  const qcInvalidateVacs  = () => qc.invalidateQueries({ queryKey: ["/api/v1/rh/vacations", "boss", approverId] });
  const qcInvalidateJusts = () => qc.invalidateQueries({ queryKey: ["/api/v1/rh/cv/justifications", "boss", approverId] });

  /* ------------ Payloads de actualización ------------- */
  const buildPermissionsPayload = (raw: any, normalized: Permission, newStatus: "Approved" | "Rejected") => {
    const PermissionID =
      raw?.PermissionID ?? raw?.permissionID ?? raw?.permissionId ?? raw?.id ?? raw?.Id ?? normalized.id;
    const EmployeeID =
      raw?.EmployeeID ?? raw?.employeeID ?? raw?.employeeId ?? normalized.employeeId;
    const PermissionTypeID =
      raw?.PermissionTypeID ?? raw?.permissionTypeID ?? raw?.permissionTypeId ?? normalized.permissionTypeId;

    const StartDate = onlyDate(raw?.StartDate ?? raw?.startDate) ?? onlyDate(normalized.startDate);
    const EndDate   = onlyDate(raw?.EndDate   ?? raw?.endDate)   ?? onlyDate(normalized.endDate);
    const Justification = raw?.Justification ?? raw?.justification ?? normalized.justification ?? "";
    const charged = !!(raw?.ChargedToVacation ?? raw?.chargedToVacation ?? normalized.chargedToVacation);
    const rawVacId = asValidFkId(raw?.VacationID ?? raw?.vacationID ?? raw?.vacationId ?? normalized.vacationId);
    const VacationID = charged ? rawVacId : undefined;
    const RowVersion = raw?.RowVersion ?? raw?.rowVersion ?? raw?.row_version ?? normalized.RowVersion;
    const HourTaken = Number(raw?.HourTaken ?? raw?.hourTaken ?? normalized.hourTaken ?? 0);

    if (!PermissionID || !EmployeeID || !PermissionTypeID || !StartDate || !EndDate) {
      throw new Error("Datos incompletos del permiso (ID, EmployeeID, PermissionTypeID, StartDate, EndDate).");
    }
    const nowIso = new Date().toISOString();

    return stripEmpty({
      PermissionID,
      EmployeeID,
      PermissionTypeID,
      StartDate,
      EndDate,
      Justification,
      Status: newStatus,
      ApprovedBy: approverId ?? raw?.ApprovedBy ?? null,
      ApprovedAt: nowIso,
      HourTaken: HourTaken > 0 ? HourTaken : 0,
      ChargedToVacation: charged || undefined,
      VacationID,
      RowVersion,
    });
  };

  const buildVacationPayload = (v: Vacation, newStatus: Vacation["Status"]) => {
    const nowIso = new Date().toISOString();
    return stripEmpty({
      VacationID: v.VacationID,
      EmployeeID: v.EmployeeID,
      StartDate: v.StartDate,
      EndDate: v.EndDate,
      DaysGranted: v.DaysGranted,
      Reason: v.Reason ?? "",
      Status: newStatus,
      ApprovedBy: approverId ?? v.ApprovedBy ?? null,
      ApprovedAt: nowIso,
      RowVersion: v.RowVersion,
    });
  };

  const buildJustificationPayload = (j: Justification, target: JustStatus) => {
    const nowIso = new Date().toISOString();
    return stripEmpty({
      punchJustId: j.punchJustId,
      employeeId: j.employeeId,
      bossEmployeeId: approverId ?? j.bossEmployeeId ?? null,
      justificationTypeId: j.justificationTypeId,
      startDate: j.startDate,
      endDate: j.endDate,
      justificationDate: j.justificationDate,
      reason: j.reason ?? "",
      hoursRequested: j.hoursRequested ?? 0,
      approved: target === "APPROVED",
      status: target,
      approvedAt: nowIso,
      approvedBy: approverId,
      comments: j.comments ?? undefined,
      createdAt: j.createdAt ?? undefined,
      createdBy: j.createdBy ?? undefined,
    });
  };

  /* ----------------- Mutaciones: Permisos ----------------- */
  const approvePermMut = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const cur = await PermisosAPI.get(id);
      if (cur.status !== "success") throw new Error("No se pudo obtener el permiso actual");
      const normalized = normalizePermission(cur.data);
      const payload = buildPermissionsPayload(cur.data, normalized, "Approved");
      const res = await PermisosAPI.update(id, payload);
      if (res.status === "error") {
        throw new Error(handleApiError(res.error, "Validación de permiso fallida"));
      }
      return res.data;
    },
    onSuccess: () => { qcInvalidatePerms(); toast({ title: "Permiso aprobado" }); },
    onError: (e: any) => toast({ title: "Error al aprobar permiso", description: e?.message ?? "Intente nuevamente", variant: "destructive" }),
  });

  const rejectPermMut = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const cur = await PermisosAPI.get(id);
      if (cur.status !== "success") throw new Error("No se pudo obtener el permiso actual");
      const normalized = normalizePermission(cur.data);
      const payload = buildPermissionsPayload(cur.data, normalized, "Rejected");
      const res = await PermisosAPI.update(id, payload);
      if (res.status === "error") {
        throw new Error(handleApiError(res.error, "Validación de permiso fallida"));
      }
      return res.data;
    },
    onSuccess: () => { qcInvalidatePerms(); toast({ title: "Permiso rechazado" }); },
    onError: (e: any) => toast({ title: "Error al rechazar permiso", description: e?.message ?? "Intente nuevamente", variant: "destructive" }),
  });

  /* ----------------- Mutaciones: Vacaciones ----------------- */
  const approveVacMut = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const cur = await VacacionesAPI.get(id);
      if (cur.status !== "success") throw new Error("No se pudo obtener la vacación actual");
      const v = normalizeVacation(cur.data);
      const nextStatus: Vacation["Status"] = v.Status === "Planned" ? "InProgress" : v.Status;
      const payload = buildVacationPayload(v, nextStatus);
      const res = await VacacionesAPI.update(id, payload);
      if (res.status === "error") throw new Error(handleApiError(res.error, "No se pudo aprobar la vacación"));
      return res.data;
    },
    onSuccess: () => { qcInvalidateVacs(); toast({ title: "Vacación aprobada (InProgress)" }); },
    onError: (e: any) => toast({ title: "Error al aprobar vacación", description: e?.message ?? "Conflicto de concurrencia.", variant: "destructive" }),
  });

  const rejectVacMut = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const cur = await VacacionesAPI.get(id);
      if (cur.status !== "success") throw new Error("No se pudo obtener la vacación actual");
      const v = normalizeVacation(cur.data);
      const payload = buildVacationPayload(v, "Canceled");
      const res = await VacacionesAPI.update(id, payload);
      if (res.status === "error") throw new Error(handleApiError(res.error, "No se pudo rechazar la vacación"));
      return res.data;
    },
    onSuccess: () => { qcInvalidateVacs(); toast({ title: "Vacación rechazada (Canceled)" }); },
    onError: (e: any) => toast({ title: "Error al rechazar vacación", description: e?.message ?? "Conflicto de concurrencia.", variant: "destructive" }),
  });

  /* ----------------- Mutaciones: Justificaciones ----------------- */
  const approveJustMut = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const cur = await JustificationsAPI.get(id);
      if (cur.status !== "success") throw new Error("No se pudo obtener la justificación actual");
      const j = normalizeJustification(cur.data);
      if (!j.punchJustId) throw new Error("ID de justificación inválido");
      const payload = buildJustificationPayload(j, "APPROVED");
      const res = await JustificationsAPI.update(j.punchJustId, payload);
      if (res.status === "error") throw new Error(handleApiError(res.error, "No se pudo aprobar la justificación"));
      return res.data;
    },
    onSuccess: () => { qcInvalidateJusts(); toast({ title: "Justificación aprobada" }); },
    onError: (e: any) => toast({ title: "Error al aprobar justificación", description: e?.message ?? "Intente nuevamente", variant: "destructive" }),
  });

  const rejectJustMut = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const cur = await JustificationsAPI.get(id);
      if (cur.status !== "success") throw new Error("No se pudo obtener la justificación actual");
      const j = normalizeJustification(cur.data);
      if (!j.punchJustId) throw new Error("ID de justificación inválido");
      const payload = buildJustificationPayload(j, "REJECTED");
      const res = await JustificationsAPI.update(j.punchJustId, payload);
      if (res.status === "error") throw new Error(handleApiError(res.error, "No se pudo rechazar la justificación"));
      return res.data;
    },
    onSuccess: () => { qcInvalidateJusts(); toast({ title: "Justificación rechazada" }); },
    onError: (e: any) => toast({ title: "Error al rechazar justificación", description: e?.message ?? "Intente nuevamente", variant: "destructive" }),
  });

  /* ----------------- Resumen ----------------- */
  const primaryPermDate = (p: Permission) =>
    p.createdAt || p.requestDate || p.startDate || p.endDate || p.approvedAt;

  const permsThisYear = allPerms.filter((p) => {
    const d = parseDateSafe(primaryPermDate(p));
    return d ? d.getFullYear() === currentYear : false;
  });

  const permsCountBy = (s: "Pending" | "Approved" | "Rejected") =>
    permsThisYear.filter((p) => canonicalPermissionStatus(p.status) === s).length;

  const vacsThisYear = allVacs.filter((v) => yearOf(v.StartDate) === currentYear);
  const vacsCountBy = (s: Vacation["Status"]) => vacsThisYear.filter((v) => v.Status === s).length;

  const justThisYear = allJusts.filter((j) => {
    const d = parseDateSafe(j.justificationDate ?? j.startDate ?? "");
    return d ? d.getFullYear() === currentYear : false;
  });
  const justCountBy = (s: JustStatus) =>
    justThisYear.filter((j) => normalizeJustStatus(j.status) === s).length;

  /* ----------------- UI ----------------- */
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Aprobaciones</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Revise y gestione permisos, vacaciones y justificaciones</p>
        </div>
      </div>

      {/* Resumen responsive */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              Permisos {currentYear}
            </CardTitle>
            <CardDescription>Total: {permsThisYear.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[{ key: "Pending", label: "Pendiente" }, { key: "Approved", label: "Aprobado" }, { key: "Rejected", label: "Rechazado" }].map((s) => (
                <div key={s.key} className="p-3 rounded-lg bg-gray-50 text-center">
                  <div className="text-xs md:text-sm text-gray-500">{s.label}</div>
                  <div className="text-xl md:text-2xl font-semibold">{permsCountBy(s.key as any)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-green-600" />
              Vacaciones {currentYear}
            </CardTitle>
            <CardDescription>Total: {vacsThisYear.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[{ key: "Planned", label: "Planeado" }, { key: "InProgress", label: "En Proceso" }, { key: "Completed", label: "Completado" }, { key: "Canceled", label: "Cancelado" }].map((s: any) => (
                <div key={s.key} className="p-3 rounded-lg bg-gray-50 text-center">
                  <div className="text-xs md:text-sm text-gray-500">{s.label}</div>
                  <div className="text-xl md:text-2xl font-semibold">{vacsCountBy(s.key)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-purple-600" />
              Justificaciones {currentYear}
            </CardTitle>
            <CardDescription>Total: {justThisYear.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[{ key: "PENDING", label: "Pendiente" }, { key: "APPROVED", label: "Aprobada" }, { key: "REJECTED", label: "Rechazada" }].map((s: any) => (
                <div key={s.key} className="p-3 rounded-lg bg-gray-50 text-center">
                  <div className="text-xs md:text-sm text-gray-500">{s.label}</div>
                  <div className="text-xl md:text-2xl font-semibold">{justCountBy(s.key)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 overflow-x-auto rounded-lg">
          <TabsTrigger value="permisos" className="flex items-center gap-2 text-xs sm:text-sm">
            <CalendarCheck className="h-4 w-4" /> Permisos ({allPerms.length})
          </TabsTrigger>
          <TabsTrigger value="vacaciones" className="flex items-center gap-2 text-xs sm:text-sm">
            <Sun className="h-4 w-4" /> Vacaciones ({allVacs.length})
          </TabsTrigger>
          <TabsTrigger value="justificaciones" className="flex items-center gap-2 text-xs sm:text-sm">
            <ClipboardCheck className="h-4 w-4" /> Justificaciones ({allJusts.length})
          </TabsTrigger>
        </TabsList>

        {/* ======================= Permisos ======================= */}
        <TabsContent value="permisos" className="space-y-4">
          <Card>
            <CardHeader className="pb-0">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Buscar</Label>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input placeholder="Empleado, tipo o motivo…" value={permFilters.q} onChange={(e) => setPermFilters((f) => ({ ...f, q: e.target.value }))} />
                  </div>
                </div>

                <div className="min-w-[160px]">
                  <Label className="text-xs text-gray-500">Estado</Label>
                  <Select value={permFilters.status} onValueChange={(v: any) => setPermFilters((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Pending">Pendiente</SelectItem>
                      <SelectItem value="Approved">Aprobado</SelectItem>
                      <SelectItem value="Rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <div>
                    <Label className="text-xs text-gray-500">Desde</Label>
                    <Input type="date" value={permFilters.from ?? ""} onChange={(e) => setPermFilters((f) => ({ ...f, from: e.target.value || undefined }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Hasta</Label>
                    <Input type="date" value={permFilters.to ?? ""} onChange={(e) => setPermFilters((f) => ({ ...f, to: e.target.value || undefined }))} />
                  </div>
                </div>

                <div className="lg:self-end">
                  <Button variant="outline" onClick={() => setPermFilters({ q: "", status: "all" })}>Limpiar</Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {loadingPerms ? (
                  <div className="py-6 text-center text-gray-500">Cargando permisos…</div>
                ) : filteredPerms.length === 0 ? (
                  <div className="py-6 text-center text-gray-500">Sin resultados</div>
                ) : (
                  filteredPerms.map((p, i) => {
                    const emp = p.employeeId ? employeesMap[p.employeeId] : undefined;
                    const approver = p.approvedBy ? employeesMap[p.approvedBy] : undefined;
                    const canonical = canonicalPermissionStatus(p.status);
                    const chip = statusChip[canonical] ?? statusChip.Pending;
                    const Icon = chip.icon;
                    const canAct = !!p.id && canonical === "Pending";
                    return (
                      <Card key={getPermissionKey(p, i)} className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-4 w-4 text-gray-500 shrink-0" />
                            <div className="truncate">
                              <div className="font-medium truncate">{emp?.fullName ?? (p.employeeId ? `#${p.employeeId}` : "—")}</div>
                              {emp?.departmentName && <div className="text-xs text-gray-500 truncate">{emp.departmentName}</div>}
                            </div>
                          </div>
                          <Badge className={chip.color}><Icon className="h-3 w-3 mr-1" />{chip.label}</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Tipo: </span>{getTypeName(p.permissionTypeId)}</div>
                          <div><span className="text-gray-500">Horas: </span>{p.hourTaken ?? 0}</div>
                          <div><span className="text-gray-500">Desde: </span>{fmtDate(p.startDate)}</div>
                          <div><span className="text-gray-500">Hasta: </span>{fmtDate(p.endDate)}</div>
                          <div className="col-span-2"><span className="text-gray-500">Motivo: </span>{p.justification || "—"}</div>
                          <div className="col-span-2"><span className="text-gray-500">Aprobado por: </span>{p.approvedBy ? (approver?.fullName ?? `#${p.approvedBy}`) : "—"}</div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={!canAct || approvePermMut.isPending} onClick={() => p.id && approvePermMut.mutate({ id: p.id })}>
                            Aprobar
                          </Button>
                          <Button size="sm" variant="destructive" disabled={!canAct || rejectPermMut.isPending} onClick={() => p.id && rejectPermMut.mutate({ id: p.id })}>
                            Rechazar
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                {loadingPerms ? (
                  <div className="py-8 text-center text-gray-500">Cargando permisos…</div>
                ) : filteredPerms.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">Sin resultados</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead>Horas</TableHead>
                          <TableHead>Solicitado</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Aprobado Por</TableHead>
                          <TableHead>Aprobado El</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPerms.map((p, i) => {
                          const emp = p.employeeId ? employeesMap[p.employeeId] : undefined;
                          const approver = p.approvedBy ? employeesMap[p.approvedBy] : undefined;
                          const canonical = canonicalPermissionStatus(p.status);
                          const chip = statusChip[canonical] ?? statusChip.Pending;
                          const Icon = chip.icon;
                          const canAct = !!p.id && canonical === "Pending";
                          return (
                            <TableRow key={getPermissionKey(p, i)}>
                              <TableCell>{p.id ?? "—"}</TableCell>
                              <TableCell className="max-w-[220px]">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <div className="truncate">
                                    <div className="font-medium truncate">{emp?.fullName ?? (p.employeeId ? `#${p.employeeId}` : "—")}</div>
                                    {emp?.departmentName && <div className="text-xs text-gray-500 truncate">{emp.departmentName}</div>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{getTypeName(p.permissionTypeId)}</TableCell>
                              <TableCell>{fmtDate(p.startDate)}</TableCell>
                              <TableCell>{fmtDate(p.endDate)}</TableCell>
                              <TableCell>{p.hourTaken ?? 0}</TableCell>
                              <TableCell>{fmtDate(p.requestDate ?? p.createdAt)}</TableCell>
                              <TableCell>
                                <Badge className={chip.color}><Icon className="h-3 w-3 mr-1" />{chip.label}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[180px]">
                                {p.approvedBy ? (approver?.fullName ?? `#${p.approvedBy}`) : "—"}
                              </TableCell>
                              <TableCell>{fmtDate(p.approvedAt)}</TableCell>
                              <TableCell title={p.justification || ""} className="max-w-[260px]">
                                {(p.justification || "—").length > 60 ? (p.justification || "—").slice(0, 60) + "…" : p.justification || "—"}
                              </TableCell>
                              <TableCell className="text-right space-x-2 whitespace-nowrap">
                                <Button size="sm" variant="outline" disabled={!canAct || approvePermMut.isPending} onClick={() => p.id && approvePermMut.mutate({ id: p.id })}>
                                  Aprobar
                                </Button>
                                <Button size="sm" variant="destructive" disabled={!canAct || rejectPermMut.isPending} onClick={() => p.id && rejectPermMut.mutate({ id: p.id })}>
                                  Rechazar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================= Vacaciones ======================= */}
        <TabsContent value="vacaciones" className="space-y-4">
          <Card>
            <CardHeader className="pb-0">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Buscar</Label>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input placeholder="Empleado o motivo…" value={vacFilters.q} onChange={(e) => setVacFilters((f) => ({ ...f, q: e.target.value }))} />
                  </div>
                </div>

                <div className="min-w-[180px]">
                  <Label className="text-xs text-gray-500">Estado</Label>
                  <Select value={vacFilters.status} onValueChange={(v: any) => setVacFilters((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Planned">Planeado</SelectItem>
                      <SelectItem value="InProgress">En Proceso</SelectItem>
                      <SelectItem value="Completed">Completado</SelectItem>
                      <SelectItem value="Canceled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <div>
                    <Label className="text-xs text-gray-500">Desde</Label>
                    <Input type="date" value={vacFilters.from ?? ""} onChange={(e) => setVacFilters((f) => ({ ...f, from: e.target.value || undefined }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Hasta</Label>
                    <Input type="date" value={vacFilters.to ?? ""} onChange={(e) => setVacFilters((f) => ({ ...f, to: e.target.value || undefined }))} />
                  </div>
                </div>

                <div className="lg:self-end">
                  <Button variant="outline" onClick={() => setVacFilters({ q: "", status: "all" })}>Limpiar</Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {loadingVacs ? (
                  <div className="py-6 text-center text-gray-500">Cargando vacaciones…</div>
                ) : filteredVacs.length === 0 ? (
                  <div className="py-6 text-center text-gray-500">Sin resultados</div>
                ) : (
                  filteredVacs.map((v, i) => {
                    const emp = v.EmployeeID ? employeesMap[v.EmployeeID] : undefined;
                    const chip = statusChip[v.Status ?? "Planned"] ?? statusChip.Planned;
                    const Icon = chip.icon;
                    const canAct = !!v.VacationID && v.Status === "Planned";
                    return (
                      <Card key={getVacationKey(v, i)} className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-4 w-4 text-gray-500 shrink-0" />
                            <div className="truncate">
                              <div className="font-medium truncate">{emp?.fullName ?? (v.EmployeeID ? `#${v.EmployeeID}` : "—")}</div>
                              {emp?.departmentName && <div className="text-xs text-gray-500 truncate">{emp.departmentName}</div>}
                            </div>
                          </div>
                          <Badge className={chip.color}><Icon className="h-3 w-3 mr-1" />{chip.label}</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Desde: </span>{fmtDate(v.StartDate)}</div>
                          <div><span className="text-gray-500">Hasta: </span>{fmtDate(v.EndDate)}</div>
                          <div><span className="text-gray-500">Días: </span>{v.DaysGranted ?? 0}</div>
                          <div className="col-span-2"><span className="text-gray-500">Motivo: </span>{v.Reason || "—"}</div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={!canAct || approveVacMut.isPending} onClick={() => v.VacationID && approveVacMut.mutate({ id: v.VacationID })}>
                            Aprobar
                          </Button>
                          <Button size="sm" variant="destructive" disabled={!canAct || rejectVacMut.isPending} onClick={() => v.VacationID && rejectVacMut.mutate({ id: v.VacationID })}>
                            Rechazar
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                {loadingVacs ? (
                  <div className="py-8 text-center text-gray-500">Cargando vacaciones…</div>
                ) : filteredVacs.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">Sin resultados</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead>Días</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Aprobado Por</TableHead>
                          <TableHead>Aprobado El</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVacs.map((v, i) => {
                          const emp = v.employeeID ? employeesMap[v.employeeID] : employeesMap[v.EmployeeID!];
                          const approver = v.ApprovedBy ? employeesMap[v.ApprovedBy] : undefined;
                          const chip = statusChip[v.Status ?? "Planned"] ?? statusChip.Planned;
                          const Icon = chip.icon;
                          const canAct = !!v.VacationID && v.Status === "Planned";
                          return (
                            <TableRow key={getVacationKey(v, i)}>
                              <TableCell>{v.VacationID ?? "—"}</TableCell>
                              <TableCell className="max-w-[220px]">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <div className="truncate">
                                    <div className="font-medium truncate">{emp?.fullName ?? (v.EmployeeID ? `#${v.EmployeeID}` : "—")}</div>
                                    {emp?.departmentName && <div className="text-xs text-gray-500 truncate">{emp.departmentName}</div>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{fmtDate(v.StartDate)}</TableCell>
                              <TableCell>{fmtDate(v.EndDate)}</TableCell>
                              <TableCell>{v.DaysGranted ?? 0}</TableCell>
                              <TableCell>
                                <Badge className={chip.color}><Icon className="h-3 w-3 mr-1" />{chip.label}</Badge>
                              </TableCell>
                              <TableCell title={v.Reason || ""} className="max-w-[260px]">
                                {(v.Reason || "—").length > 60 ? (v.Reason || "—").slice(0, 60) + "…" : v.Reason || "—"}
                              </TableCell>
                              <TableCell className="max-w-[180px]">
                                {v.ApprovedBy ? (approver?.fullName ?? `#${v.ApprovedBy}`) : "—"}
                              </TableCell>
                              <TableCell>{fmtDate(v.ApprovedAt)}</TableCell>
                              <TableCell className="text-right space-x-2 whitespace-nowrap">
                                <Button size="sm" variant="outline" disabled={!canAct || approveVacMut.isPending} onClick={() => v.VacationID && approveVacMut.mutate({ id: v.VacationID })}>
                                  Aprobar
                                </Button>
                                <Button size="sm" variant="destructive" disabled={!canAct || rejectVacMut.isPending} onClick={() => v.VacationID && rejectVacMut.mutate({ id: v.VacationID })}>
                                  Rechazar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================= Justificaciones ======================= */}
        <TabsContent value="justificaciones" className="space-y-4">
          <Card>
            <CardHeader className="pb-0">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Buscar</Label>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input placeholder="Empleado o motivo…" value={justFilters.q} onChange={(e) => setJustFilters((f) => ({ ...f, q: e.target.value }))} />
                  </div>
                </div>

                <div className="min-w-[180px]">
                  <Label className="text-xs text-gray-500">Estado</Label>
                  <Select value={justFilters.status} onValueChange={(v: any) => setJustFilters((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="APPROVED">Aprobada</SelectItem>
                      <SelectItem value="REJECTED">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <div>
                    <Label className="text-xs text-gray-500">Desde</Label>
                    <Input type="date" value={justFilters.from ?? ""} onChange={(e) => setJustFilters((f) => ({ ...f, from: e.target.value || undefined }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Hasta</Label>
                    <Input type="date" value={justFilters.to ?? ""} onChange={(e) => setJustFilters((f) => ({ ...f, to: e.target.value || undefined }))} />
                  </div>
                </div>

                <div className="lg:self-end">
                  <Button variant="outline" onClick={() => setJustFilters({ q: "", status: "all" })}>Limpiar</Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {loadingJusts ? (
                  <div className="py-6 text-center text-gray-500">Cargando justificaciones…</div>
                ) : filteredJusts.length === 0 ? (
                  <div className="py-6 text-center text-gray-500">Sin resultados</div>
                ) : (
                  filteredJusts.map((j, i) => {
                    const emp = j.employeeId ? employeesMap[j.employeeId] : undefined;
                    const chip = statusChip[normalizeJustStatus(j.status)] ?? statusChip.PENDING;
                    const Icon = chip.icon;
                    const canAct = !!j.punchJustId && normalizeJustStatus(j.status) === "PENDING";
                    return (
                      <Card key={getJustKey(j, i)} className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-4 w-4 text-gray-500 shrink-0" />
                            <div className="truncate">
                              <div className="font-medium truncate">{emp?.fullName ?? (j.employeeId ? `#${j.employeeId}` : "—")}</div>
                              {emp?.departmentName && <div className="text-xs text-gray-500 truncate">{emp.departmentName}</div>}
                            </div>
                          </div>
                          <Badge className={chip.color}><Icon className="h-3 w-3 mr-1" />{chip.label}</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Fecha/Desde: </span>{fmtDate(j.justificationDate ?? j.startDate)}</div>
                          <div><span className="text-gray-500">Hasta: </span>{fmtDate(j.endDate)}</div>
                          <div><span className="text-gray-500">Horas: </span>{j.hoursRequested ?? 0}</div>
                          <div className="col-span-2"><span className="text-gray-500">Motivo: </span>{j.reason || "—"}</div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={!canAct || approveJustMut.isPending} onClick={() => j.punchJustId && approveJustMut.mutate({ id: j.punchJustId })}>
                            Aprobar
                          </Button>
                          <Button size="sm" variant="destructive" disabled={!canAct || rejectJustMut.isPending} onClick={() => j.punchJustId && rejectJustMut.mutate({ id: j.punchJustId })}>
                            Rechazar
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                {loadingJusts ? (
                  <div className="py-8 text-center text-gray-500">Cargando justificaciones…</div>
                ) : filteredJusts.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">Sin resultados</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Fecha / Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead>Horas</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJusts.map((j, i) => {
                          const emp = j.employeeId ? employeesMap[j.employeeId] : undefined;
                          const chip = statusChip[normalizeJustStatus(j.status)] ?? statusChip.PENDING;
                          const Icon = chip.icon;
                          const canAct = !!j.punchJustId && normalizeJustStatus(j.status) === "PENDING";
                          return (
                            <TableRow key={getJustKey(j, i)}>
                              <TableCell>{j.punchJustId ?? "—"}</TableCell>
                              <TableCell className="max-w-[220px]">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <div className="truncate">
                                    <div className="font-medium truncate">{emp?.fullName ?? (j.employeeId ? `#${j.employeeId}` : "—")}</div>
                                    {emp?.departmentName && <div className="text-xs text-gray-500 truncate">{emp.departmentName}</div>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{fmtDate(j.justificationDate ?? j.startDate)}</TableCell>
                              <TableCell>{fmtDate(j.endDate)}</TableCell>
                              <TableCell>{j.hoursRequested ?? 0}</TableCell>
                              <TableCell>
                                <Badge className={chip.color}><Icon className="h-3 w-3 mr-1" />{chip.label}</Badge>
                              </TableCell>
                              <TableCell title={j.reason || ""} className="max-w-[260px]">
                                {(j.reason || "—").length > 60 ? (j.reason || "—").slice(0, 60) + "…" : j.reason || "—"}
                              </TableCell>
                              <TableCell className="text-right space-x-2 whitespace-nowrap">
                                <Button size="sm" variant="outline" disabled={!canAct || approveJustMut.isPending} onClick={() => j.punchJustId && approveJustMut.mutate({ id: j.punchJustId })}>
                                  Aprobar
                                </Button>
                                <Button size="sm" variant="destructive" disabled={!canAct || rejectJustMut.isPending} onClick={() => j.punchJustId && rejectJustMut.mutate({ id: j.punchJustId })}>
                                  Rechazar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
