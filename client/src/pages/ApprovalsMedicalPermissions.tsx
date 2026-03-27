// src/pages/ApprovalsMedicalPermissions.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  PermisosAPI,
  TiposPermisosAPI,
  VistaDetallesEmpleadosAPI,
  DocumentsAPI,
  handleApiError,
} from "@/lib/api";
import {
  Search,
  User,
  Clock,
  CheckCircle,
  XCircle,
  HeartPulse,
  Stethoscope,
  CalendarRange,
  RefreshCw,
  Paperclip,
  Eye,
  Download,
  FileText,
} from "lucide-react";
import { parseApiError } from "@/lib/error-handling";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* -------------------- Tipos -------------------- */
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

interface PermissionType {
  id: number;
  name: string;
  isMedical?: boolean;
  requiresDocumentation?: boolean;
}

interface EmployeeLite {
  employeeID: number;
  fullName: string;
  departmentName?: string;
}

interface PermissionDocument {
  fileGuid?: string;
  fileName?: string;
  originalFileName?: string;
  documentTypeName?: string;
  uploadedAt?: string;
  relativePath?: string;
  status?: number;
}

/* -------------------- Helpers -------------------- */
const statusChip: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  Pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  Approved: { label: "Aprobado", color: "bg-green-100 text-green-800", icon: CheckCircle },
  Rejected: { label: "Rechazado", color: "bg-red-100 text-red-800", icon: XCircle },
};

function parseDateSafe(s?: string): Date | null {
  if (!s) return null;
  const m = /\/Date\((\d+)\)\//.exec(s);
  if (m) {
    const d = new Date(Number(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  let str = s.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(str)) str = str.replace(" ", "T");
  const d1 = new Date(str);
  if (!isNaN(d1.getTime())) return d1;
  const only = str.split("T")[0];
  const d2 = new Date(only);
  return isNaN(d2.getTime()) ? null : d2;
}

const fmtDate = (s?: string | null) => {
  const d = parseDateSafe(s ?? undefined);
  return d ? d.toLocaleDateString("es-ES") : "—";
};

const fmtDateTime = (s?: string | null) => {
  const d = parseDateSafe(s ?? undefined);
  return d
    ? `${d.toLocaleDateString("es-ES")} ${d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "—";
};

const currentYear = new Date().getFullYear();

const safeArray = (data: any): any[] =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
        ? data.results
        : [];

const pick = (obj: any, names: string[]) => {
  for (const n of names) {
    if (obj?.[n] !== undefined && obj?.[n] !== null) return obj[n];
  }
  return undefined;
};

const toNumber = (v: any) => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const toBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";

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

const normalizePermissionType = (t: any): PermissionType => ({
  id: toNumber(pick(t, ["id", "Id", "ID", "typeId", "TypeId", "TypeID"]))!,
  name: pick(t, ["name", "Name"]) ?? "—",
  isMedical: toBool(pick(t, ["isMedical", "IsMedical"])),
  requiresDocumentation: toBool(
    pick(t, ["requiresDocumentation", "RequiresDocumentation", "attachedFile", "AttachedFile"])
  ),
});

const normalizePermission = (p: any): Permission => {
  const id = toNumber(
    pick(p, ["id", "Id", "ID", "permissionId", "PermissionId", "PermissionID", "permissionID", "permission_id"])
  );

  return {
    id,
    employeeId: toNumber(pick(p, ["employeeId", "EmployeeID", "employeeID", "EmployeeId", "employee_id"])),
    permissionTypeId: toNumber(pick(p, ["permissionTypeId", "PermissionTypeID", "PermissionTypeId", "permission_type_id"])),
    startDate: pick(p, ["startDate", "StartDate", "start_date"]),
    endDate: pick(p, ["endDate", "EndDate", "end_date"]),
    justification: pick(p, ["justification", "Justification"]),
    status: canonicalPermissionStatus(pick(p, ["status", "Status"])),
    requestDate: pick(p, ["requestDate", "RequestDate", "createdAt", "CreatedAt"]),
    createdAt: pick(p, ["createdAt", "CreatedAt"]),
    approvedAt: pick(p, ["approvedAt", "ApprovedAt"]),
    approvedBy: toNumber(pick(p, ["approvedBy", "ApprovedBy"])),
    RowVersion: pick(p, ["RowVersion", "rowVersion", "row_version"]),
    chargedToVacation: !!pick(p, ["chargedToVacation", "ChargedToVacation"]),
    vacationId: toNumber(pick(p, ["VacationID", "vacationID", "vacationId"])),
    hourTaken: toNumber(pick(p, ["hourTaken", "HourTaken"])) ?? 0,
  };
};

const getPermissionKey = (p: Permission, i: number) =>
  `medical-perm-${p.id ?? `${p.employeeId}-${p.startDate}-${p.endDate}-${p.requestDate ?? ""}-${i}`}`;

const onlyDate = (s?: string | null) => (s ? String(s).split("T")[0] : undefined);

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

const asTime = (s?: string | null) => {
  const d = parseDateSafe(s ?? undefined);
  return d ? d.getTime() : 0;
};

const fileLooksPreviewable = (fileName?: string) => {
  const lower = String(fileName || "").toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  );
};

/* -------------------- Página -------------------- */
export default function ApprovalsMedicalPermissionsPage() {
  const { toast } = useToast();
  const { employeeDetails } = useAuth();
  const qc = useQueryClient();

  const doctorEmployeeId = employeeDetails?.employeeID;

  const [filters, setFilters] = useState<{
    q: string;
    status: "all" | "Pending" | "Approved" | "Rejected";
    year: "current" | "all";
    from?: string;
    to?: string;
  }>({
    q: "",
    status: "Pending",
    year: "current",
  });

  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  /* --------- Datos base --------- */
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
    return safeArray(typesRes.data)
      .map(normalizePermissionType)
      .filter((t) => t.id != null);
  }, [typesRes]);

  const employeesMap: Record<number, EmployeeLite> = useMemo(() => {
    if (employeesRes?.status !== "success") return {};
    const arr = safeArray(employeesRes.data);
    const map: Record<number, EmployeeLite> = {};

    for (const r of arr) {
      const id = toNumber(pick(r, ["employeeID", "EmployeeID", "id", "Id", "ID"]));
      const fullName =
        pick(r, ["fullName", "FullName"]) ??
        `${pick(r, ["firstName", "FirstName"]) ?? ""} ${pick(r, ["lastName", "LastName"]) ?? ""}`.trim();

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

  const getTypeName = (id?: number) =>
    id == null ? "—" : permissionTypes.find((t) => Number(t.id) === Number(id))?.name ?? "—";

  /* --------- Permisos médicos --------- */
  const { data: permsRes, isLoading: loadingPerms, refetch } = useQuery({
    queryKey: ["/api/v1/rh/permissions", "medical", "pending"],
    queryFn: () => PermisosAPI.getPendingMedical(),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (permsRes?.status === "success") {
      console.log("RAW medical permissions sample:", safeArray(permsRes.data)[0]);
    }
  }, [permsRes]);

  const allPerms: Permission[] =
    permsRes?.status === "success" ? safeArray(permsRes.data).map(normalizePermission) : [];

  const primaryPermCreated = (p: Permission) =>
    p.createdAt || p.requestDate || p.startDate || p.endDate || p.approvedAt;

  const filteredPerms = useMemo(() => {
    return allPerms
      .filter((p) => {
        const empName = (p.employeeId && employeesMap[p.employeeId]?.fullName?.toLowerCase()) ?? "";
        const just = (p.justification ?? "").toLowerCase();
        const typeName = getTypeName(p.permissionTypeId).toLowerCase();
        const q = filters.q.toLowerCase();
        const textOk = !q || empName.includes(q) || just.includes(q) || typeName.includes(q);

        const canon = canonicalPermissionStatus(p.status);
        const statusOk = filters.status === "all" || canon === filters.status;

        const df = filters.from ? parseDateSafe(filters.from) : null;
        const dt = filters.to ? parseDateSafe(filters.to) : null;
        const s = parseDateSafe(p.startDate || "");
        const e = parseDateSafe(p.endDate || "");
        const fromOk = !df || (s && s >= df);
        const toOk = !dt || (e && e <= dt);

        const createdD = parseDateSafe(primaryPermCreated(p));
        const yearOk = filters.year === "all" || (createdD ? createdD.getFullYear() === currentYear : false);

        return textOk && statusOk && fromOk && toOk && yearOk;
      })
      .sort((a, b) => {
        const ra = canonicalPermissionStatus(a.status) === "Pending" ? 0 : 1;
        const rb = canonicalPermissionStatus(b.status) === "Pending" ? 0 : 1;
        if (ra !== rb) return ra - rb;

        const ta = asTime(primaryPermCreated(a));
        const tb = asTime(primaryPermCreated(b));
        if (ta !== tb) return tb - ta;

        return (b.id ?? 0) - (a.id ?? 0);
      });
  }, [allPerms, filters, employeesMap, permissionTypes]);

  /* --------- Documentos --------- */
  const selectedPermissionType = useMemo(() => {
    if (!selectedPermission?.permissionTypeId) return null;
    return permissionTypes.find((t) => Number(t.id) === Number(selectedPermission.permissionTypeId)) ?? null;
  }, [selectedPermission, permissionTypes]);

  const { data: docsRes, isLoading: loadingDocs } = useQuery({
    queryKey: ["/api/v1/rh/documents/entity", "permission", selectedPermission?.id],
    enabled: isDocsOpen && !!selectedPermission?.id,
    queryFn: async () => {
      return DocumentsAPI.listByEntity({
        directoryCode: "HRPERMISSION",
        entityType: "PERMISSION",
        entityId: selectedPermission!.id!,
      });
    },
    refetchOnWindowFocus: false,
    staleTime: 15 * 1000,
  });

  const selectedDocs: PermissionDocument[] = useMemo(() => {
    if (docsRes?.status !== "success") return [];
    return safeArray(docsRes.data);
  }, [docsRes]);

  const handleOpenDocument = async (fileGuid?: string, fileName?: string, forceDownload = false) => {
    if (!fileGuid) {
      toast({
        title: "Error",
        description: "No se encontró el identificador del documento.",
        variant: "destructive",
      });
      return;
    }

    const res = await DocumentsAPI.download(fileGuid);

    if (res.status === "error") {
      toast({
        title: "Error",
        description: handleApiError(res.error, "No se pudo abrir el documento."),
        variant: "destructive",
      });
      return;
    }

    const blob = res.data;
    const blobUrl = window.URL.createObjectURL(blob);
    const previewable = fileLooksPreviewable(fileName);

    if (previewable && !forceDownload) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "documento";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);
  };

  /* --------- Mutaciones --------- */
  const buildPermissionsPayload = (raw: any, normalized: Permission, newStatus: "Approved" | "Rejected") => {
    const PermissionID =
      raw?.PermissionID ?? raw?.permissionID ?? raw?.permissionId ?? raw?.id ?? raw?.Id ?? normalized.id;
    const EmployeeID =
      raw?.EmployeeID ?? raw?.employeeID ?? raw?.employeeId ?? normalized.employeeId;
    const PermissionTypeID =
      raw?.PermissionTypeID ?? raw?.permissionTypeID ?? raw?.permissionTypeId ?? normalized.permissionTypeId;

    const StartDate = onlyDate(raw?.StartDate ?? raw?.startDate) ?? onlyDate(normalized.startDate);
    const EndDate = onlyDate(raw?.EndDate ?? raw?.endDate) ?? onlyDate(normalized.endDate);
    const Justification = raw?.Justification ?? raw?.justification ?? normalized.justification ?? "";
    const charged = !!(raw?.ChargedToVacation ?? raw?.chargedToVacation ?? normalized.chargedToVacation);
    const rawVacId = asValidFkId(raw?.VacationID ?? raw?.vacationID ?? raw?.vacationId ?? normalized.vacationId);
    const VacationID = charged ? rawVacId : undefined;
    const RowVersion = raw?.RowVersion ?? raw?.rowVersion ?? raw?.row_version ?? normalized.RowVersion;
    const HourTaken = Number(raw?.HourTaken ?? raw?.hourTaken ?? normalized.hourTaken ?? 0);

    if (!PermissionID || !EmployeeID || !PermissionTypeID || !StartDate || !EndDate) {
      throw new Error("Datos incompletos del permiso médico (ID, EmployeeID, PermissionTypeID, StartDate, EndDate).");
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
      ApprovedBy: doctorEmployeeId ?? raw?.ApprovedBy ?? null,
      ApprovedAt: nowIso,
      HourTaken: HourTaken > 0 ? HourTaken : 0,
      ChargedToVacation: charged || undefined,
      VacationID,
      RowVersion,
    });
  };

  const approvePermMut = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const cur = await PermisosAPI.get(id);
      if (cur.status !== "success") throw new Error("No se pudo obtener el permiso médico actual");

      const normalized = normalizePermission(cur.data);
      const payload = buildPermissionsPayload(cur.data, normalized, "Approved");
      const res = await PermisosAPI.update(id, payload);

      if (res.status === "error") {
        throw new Error(handleApiError(res.error, "Validación de permiso médico fallida"));
      }

      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/rh/permissions", "medical", "pending"] });
      toast({ title: "Permiso médico aprobado" });
    },
    onError: (e: unknown) =>
      toast({
        title: "Error al aprobar permiso médico",
        description: parseApiError(e).message,
        variant: "destructive",
      }),
  });

  const rejectPermMut = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const cur = await PermisosAPI.get(id);
      if (cur.status !== "success") throw new Error("No se pudo obtener el permiso médico actual");

      const normalized = normalizePermission(cur.data);
      const payload = buildPermissionsPayload(cur.data, normalized, "Rejected");
      const res = await PermisosAPI.update(id, payload);

      if (res.status === "error") {
        throw new Error(handleApiError(res.error, "Validación de permiso médico fallida"));
      }

      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/rh/permissions", "medical", "pending"] });
      toast({ title: "Permiso médico rechazado" });
    },
    onError: (e: unknown) =>
      toast({
        title: "Error al rechazar permiso médico",
        description: parseApiError(e).message,
        variant: "destructive",
      }),
  });

  /* --------- Resumen --------- */
  const permsThisYear = allPerms.filter((p) => {
    const d = parseDateSafe(primaryPermCreated(p));
    return d ? d.getFullYear() === currentYear : false;
  });

  const permsCountBy = (s: "Pending" | "Approved" | "Rejected") =>
    permsThisYear.filter((p) => canonicalPermissionStatus(p.status) === s).length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Aprobación de Permisos Médicos
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Gestión de permisos médicos para revisión y aprobación por doctores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
            <Stethoscope className="h-3 w-3 mr-1" />
            Médico
          </Badge>

          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <HeartPulse className="h-5 w-5 text-rose-600" />
              Médicos {currentYear}
            </CardTitle>
            <CardDescription>Total: {permsThisYear.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "Pending", label: "Pendiente" },
                { key: "Approved", label: "Aprobado" },
                { key: "Rejected", label: "Rechazado" },
              ].map((s) => (
                <div key={s.key} className="p-3 rounded-lg bg-gray-50 text-center">
                  <div className="text-xs md:text-sm text-gray-500">{s.label}</div>
                  <div className="text-xl md:text-2xl font-semibold">{permsCountBy(s.key as any)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow sm:col-span-1 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <CalendarRange className="h-5 w-5 text-blue-600" />
              Filtros
            </CardTitle>
            <CardDescription>Busque y filtre solicitudes médicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <Label className="text-xs text-gray-500">Buscar</Label>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500 shrink-0" />
                  <Input
                    placeholder="Empleado, tipo o motivo…"
                    value={filters.q}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Año</Label>
                <Select
                  value={filters.year}
                  onValueChange={(v: "current" | "all") => setFilters((f) => ({ ...f, year: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Año actual</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Estado</Label>
                <Select
                  value={filters.status}
                  onValueChange={(v: "all" | "Pending" | "Approved" | "Rejected") =>
                    setFilters((f) => ({ ...f, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Pending">Pendiente</SelectItem>
                    <SelectItem value="Approved">Aprobado</SelectItem>
                    <SelectItem value="Rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1">
                <div>
                  <Label className="text-xs text-gray-500">Desde</Label>
                  <Input
                    type="date"
                    value={filters.from ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Hasta</Label>
                  <Input
                    type="date"
                    value={filters.to ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-gray-500">
                Mostrando <span className="font-medium">{filteredPerms.length}</span> solicitudes
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    q: "",
                    status: "Pending",
                    year: "current",
                  })
                }
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes médicas</CardTitle>
          <CardDescription>
            Permisos médicos pendientes y su historial reciente
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="md:hidden space-y-3">
            {loadingPerms ? (
              <div className="py-6 text-center text-gray-500">Cargando permisos médicos…</div>
            ) : filteredPerms.length === 0 ? (
              <div className="py-6 text-center text-gray-500">Sin resultados</div>
            ) : (
              filteredPerms.map((p, i) => {
                const emp = p.employeeId ? employeesMap[p.employeeId] : undefined;
                const canonical = canonicalPermissionStatus(p.status);
                const chip = statusChip[canonical] ?? statusChip.Pending;
                const Icon = chip.icon;
                const canAct = !!p.id && canonical === "Pending";
                const created = primaryPermCreated(p);

                return (
                  <Card key={getPermissionKey(p, i)} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 text-gray-500 shrink-0" />
                        <div className="truncate">
                          <div className="font-medium truncate">
                            {emp?.fullName ?? (p.employeeId ? `#${p.employeeId}` : "—")}
                          </div>
                          {emp?.departmentName && (
                            <div className="text-xs text-gray-500 truncate">{emp.departmentName}</div>
                          )}
                        </div>
                      </div>

                      <Badge className={chip.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {chip.label}
                      </Badge>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Creado: {fmtDateTime(created)}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Tipo: </span>
                        {getTypeName(p.permissionTypeId)}
                      </div>
                      <div>
                        <span className="text-gray-500">Horas: </span>
                        {p.hourTaken ?? 0}
                      </div>
                      <div>
                        <span className="text-gray-500">Desde: </span>
                        {fmtDate(p.startDate)}
                      </div>
                      <div>
                        <span className="text-gray-500">Hasta: </span>
                        {fmtDate(p.endDate)}
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Motivo: </span>
                        {p.justification || "—"}
                      </div>
                    </div>

                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          setSelectedPermission(p);
                          setIsDocsOpen(true);
                        }}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Ver adjuntos
                      </Button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        className="w-full"
                        variant="outline"
                        disabled={!canAct || approvePermMut.isPending}
                        onClick={() => p.id && approvePermMut.mutate({ id: p.id })}
                      >
                        Aprobar
                      </Button>

                      <Button
                        size="sm"
                        className="w-full"
                        variant="destructive"
                        disabled={!canAct || rejectPermMut.isPending}
                        onClick={() => p.id && rejectPermMut.mutate({ id: p.id })}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          <div className="hidden md:block">
            {loadingPerms ? (
              <div className="py-8 text-center text-gray-500">Cargando permisos médicos…</div>
            ) : filteredPerms.length === 0 ? (
              <div className="py-8 text-center text-gray-500">Sin resultados</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hasta</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredPerms.map((p, i) => {
                      const emp = p.employeeId ? employeesMap[p.employeeId] : undefined;
                      const canonical = canonicalPermissionStatus(p.status);
                      const chip = statusChip[canonical] ?? statusChip.Pending;
                      const Icon = chip.icon;
                      const canAct = !!p.id && canonical === "Pending";
                      const created = primaryPermCreated(p);

                      return (
                        <TableRow key={getPermissionKey(p, i)}>
                          <TableCell>{p.id ?? "—"}</TableCell>

                          <TableCell className="max-w-[240px]">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <div className="truncate">
                                <div className="font-medium truncate">
                                  {emp?.fullName ?? (p.employeeId ? `#${p.employeeId}` : "—")}
                                </div>
                                {emp?.departmentName && (
                                  <div className="text-xs text-gray-500 truncate">{emp.departmentName}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>{getTypeName(p.permissionTypeId)}</TableCell>
                          <TableCell>{fmtDateTime(created)}</TableCell>
                          <TableCell>{fmtDate(p.startDate)}</TableCell>
                          <TableCell>{fmtDate(p.endDate)}</TableCell>
                          <TableCell>{p.hourTaken ?? 0}</TableCell>

                          <TableCell>
                            <Badge className={chip.color}>
                              <Icon className="h-3 w-3 mr-1" />
                              {chip.label}
                            </Badge>
                          </TableCell>

                          <TableCell title={p.justification || ""} className="max-w-[320px]">
                            {(p.justification || "—").length > 60
                              ? (p.justification || "—").slice(0, 60) + "…"
                              : p.justification || "—"}
                          </TableCell>

                          <TableCell className="text-right space-x-2 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedPermission(p);
                                setIsDocsOpen(true);
                              }}
                            >
                              <Paperclip className="h-4 w-4 mr-1" />
                              Adjuntos
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canAct || approvePermMut.isPending}
                              onClick={() => p.id && approvePermMut.mutate({ id: p.id })}
                            >
                              Aprobar
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!canAct || rejectPermMut.isPending}
                              onClick={() => p.id && rejectPermMut.mutate({ id: p.id })}
                            >
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

      <Dialog open={isDocsOpen} onOpenChange={setIsDocsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjuntos del permiso médico</DialogTitle>
            <DialogDescription>
              {selectedPermission
                ? `Permiso #${selectedPermission.id ?? "—"} · ${getTypeName(selectedPermission.permissionTypeId)}`
                : "Documentos adjuntos del permiso"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPermissionType?.requiresDocumentation === false && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Este tipo no está configurado para requerir documentación, pero igual pueden existir archivos adjuntos.
              </div>
            )}

            {loadingDocs ? (
              <div className="py-6 text-center text-gray-500">Cargando adjuntos…</div>
            ) : selectedDocs.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                No hay documentos adjuntos para este permiso.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDocs.map((doc, idx) => (
                  <div
                    key={doc.fileGuid ?? `${doc.fileName}-${idx}`}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium truncate">
                        <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                        <span className="truncate">
                          {doc.originalFileName || doc.fileName || "Documento"}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-gray-500 space-y-1">
                        {doc.documentTypeName ? <div>Tipo: {doc.documentTypeName}</div> : null}
                        {doc.uploadedAt ? <div>Subido: {fmtDateTime(doc.uploadedAt)}</div> : null}
                        {doc.relativePath ? <div className="truncate">Ruta: {doc.relativePath}</div> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleOpenDocument(doc.fileGuid, doc.originalFileName || doc.fileName, false)
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleOpenDocument(doc.fileGuid, doc.originalFileName || doc.fileName, true)
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}