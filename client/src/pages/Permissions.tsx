// src/pages/Permissions.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Sun, Wallet, RotateCcw, X, Filter } from "lucide-react";

import PermissionForm, { type DocumentsConfig } from "@/components/forms/PermissionForm";
import VacationForm from "@/components/forms/VacationForm";

import {
  PermisosAPI,
  VacacionesAPI,
  TimeBalanceAPI,
  ParametersAPI,
  DirectoryParametersAPI,
  TiposPermisosAPI,
  type ApiResponse,
} from "@/lib/api";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import type { PermissionType } from "@/types/permission";

import {
  PERMISSION_DIRECTORY_CODE,
  PERMISSION_ENTITY_TYPE,
} from "@/features/constants";

// Turn on logs by setting VITE_DEBUG_AUTH=true in .env
const DEBUG = import.meta.env.VITE_DEBUG_AUTH === "true";

const permStatusLabels: Record<string, string> = {
  Pending: "Pendiente",
  Approved: "Aprobado",
  Rejected: "Rechazado",
  Canceled: "Cancelado",
  Cancelled: "Cancelado",
  Annulled: "Anulado",
  Anulado: "Anulado",
};

const permStatusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  Approved: "bg-green-100 text-green-800 hover:bg-green-100",
  Rejected: "bg-red-100 text-red-800 hover:bg-red-100",
  Canceled: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  Cancelled: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  Annulled: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  Anulado: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

const vacStatusLabels: Record<string, string> = {
  Planned: "Planificado",
  Approved: "Aprobado",
  InProgress: "En progreso",
  Completed: "Completado",
  Canceled: "Cancelado",
  Cancelled: "Cancelado",
  Annulled: "Anulado",
  Anulado: "Anulado",
};

const vacStatusColors: Record<string, string> = {
  Planned: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  Approved: "bg-green-100 text-green-800 hover:bg-green-100",
  InProgress: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Completed: "bg-green-100 text-green-800 hover:bg-green-100",
  Canceled: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  Cancelled: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  Annulled: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  Anulado: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

const fmtDate = (d?: string) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const dateOnly = (s: string) => String(s).split("T")[0];

type WorkSplit = { d: number; h: number; m: number; rawMin: number };

const splitWorkTime = (totalMinutes?: number | null, workdayMinutes = 8 * 60): WorkSplit => {
  const rawMin = Math.max(0, Number(totalMinutes ?? 0));
  const dayBase = Math.max(1, Number(workdayMinutes || 480));
  const d = Math.floor(rawMin / dayBase);
  const rest = rawMin % dayBase;
  const h = Math.floor(rest / 60);
  const m = rest % 60;
  return { d, h, m, rawMin };
};

const fmtWorkTime = (totalMinutes?: number | null, workdayMinutes = 8 * 60) => {
  const { d, h, m, rawMin } = splitWorkTime(totalMinutes, workdayMinutes);
  if (rawMin === 0) return "0m";
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(" ");
};

const extractParamMinutes = (data: unknown): number | null => {
  if (data == null) return null;
  if (typeof data === "number") return Number.isFinite(data) ? data : null;
  if (typeof data === "string") {
    const n = Number(data);
    return Number.isFinite(n) ? n : null;
  }

  const obj = data as any;

  const candidate =
    obj.value ??
    obj.parameterValue ??
    obj.paramValue ??
    obj.valor ??
    obj.minutes ??
    obj.intValue ??
    obj.numberValue ??
    obj.data?.value ??
    obj.data?.parameterValue ??
    obj.data?.paramValue ??
    obj.data?.valor;

  if (candidate != null) {
    const n = Number(candidate);
    return Number.isFinite(n) ? n : null;
  }

  if (Array.isArray(obj) && obj.length) return extractParamMinutes(obj[0]);
  return null;
};

const extractTimeBalance = (resp: any) => {
  if (!resp) return null;
  const base = resp?.status === "success" ? resp.data : resp?.data ?? resp;
  const b = base?.data ?? base;

  if (!b || typeof b !== "object") return null;

  const vacationAvailableMin =
    b.vacationAvailableMin ??
    b.vacationAvailable ??
    b.vacationMin ??
    b.availableVacationMin ??
    b.availableMin ??
    b.vacationsAvailableMin ??
    0;

  const recoveryPendingMin =
    b.recoveryPendingMin ?? b.pendingRecoveryMin ?? b.recoveryMin ?? b.recoveryPending ?? b.pendingMin ?? 0;

  return {
    ...b,
    vacationAvailableMin: Number(vacationAvailableMin ?? 0),
    recoveryPendingMin: Number(recoveryPendingMin ?? 0),
  };
};

// Normaliza params de directorio (HRPERMISSION)
const normalizeDirParam = (resp: any) => {
  const base = resp?.status === "success" ? resp.data : resp?.data ?? resp;
  const p = base?.data ?? base;

  if (!p || typeof p !== "object") return null;

  const code = String(p.code ?? p.Code ?? "HRPERMISSION");
  const maxSizeMb = Number(p.maxSizeMb ?? p.maxSizeMB ?? p.MaxSizeMb ?? 25);

  const extensionRaw = String(p.extension ?? p.Extension ?? "").trim();
  const accept = extensionRaw ? `.${extensionRaw.replace(/^\./, "").toLowerCase()}` : ".pdf";

  const relativePathRaw = String(p.relativePath ?? p.RelativePath ?? "").trim();
  const relativePath = relativePathRaw.length > 0 ? relativePathRaw : "/hr-permissions/";

  const maxFiles = Number(p.maxFiles ?? p.MaxFiles ?? 10);

  return { code, maxSizeMb, accept, relativePath, maxFiles, raw: p };
};

function MetricCard(props: {
  title: string;
  subtitle?: string;
  valueMinutes?: number | null;
  workdayMinutes: number;
  emphasize?: boolean;
}) {
  const { title, subtitle, valueMinutes, workdayMinutes, emphasize } = props;
  const s = splitWorkTime(valueMinutes, workdayMinutes);

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${emphasize ? "bg-card" : "bg-muted/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>

        <div className="rounded-lg border bg-background/60 px-2 py-1 text-sm">
          {fmtWorkTime(valueMinutes, workdayMinutes)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-background/60 p-3 text-center">
          <div className={`font-bold leading-none ${emphasize ? "text-5xl" : "text-4xl"}`}>{s.d}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">días</div>
        </div>
        <div className="rounded-xl bg-background/60 p-3 text-center">
          <div className={`font-bold leading-none ${emphasize ? "text-5xl" : "text-4xl"}`}>{s.h}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">horas</div>
        </div>
        <div className="rounded-xl bg-background/60 p-3 text-center">
          <div className={`font-bold leading-none ${emphasize ? "text-5xl" : "text-4xl"}`}>{s.m}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">min</div>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-muted/20 blur-2xl" />
    </div>
  );
}

const getPermissionId = (p: any) => p?.permissionId ?? p?.PermissionId ?? p?.id ?? p?.ID ?? null;

const getPermissionTypeId = (p: any) =>
  p?.permissionTypeId ??
  p?.permissionTypeID ??
  p?.PermissionTypeId ??
  p?.typeId ??
  p?.TypeId ??
  p?.permissionType ??
  p?.PermissionType ??
  null;

/**
 * Resuelve el nombre del tipo desde el Map construido por el servicio /permission-types.
 * Si no existe, retorna "Tipo #id" para no mostrar vacío.
 */
const resolvePermissionTypeName = (p: any, typeNameById: Map<number, string>) => {
  const typeId = getPermissionTypeId(p);
  const idNum = Number(typeId);

  if (Number.isFinite(idNum)) {
    return typeNameById.get(idNum) ?? `Tipo #${idNum}`;
  }

  const direct =
    p?.permissionTypeName ??
    p?.PermissionTypeName ??
    p?.typeName ??
    p?.TypeName ??
    p?.permissionTypeName ??
    p?.permissionType ??
    "";

  const directStr = String(direct ?? "").trim();
  return directStr || "-";
};

export default function PermissionsPage() {
  const { toast } = useToast();
  const { employeeDetails } = useAuth();
  const employeeId = employeeDetails?.employeeID ?? 0;

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();

  const [activeTab, setActiveTab] = useState<"permissions" | "vacations">("permissions");
  const [isPermissionFormOpen, setIsPermissionFormOpen] = useState(false);
  const [isVacationFormOpen, setIsVacationFormOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<any | null>(null);
  const [editingVacation, setEditingVacation] = useState<any | null>(null);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<"CURRENT" | "ALL">("CURRENT");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    if (!DEBUG) return;
    console.group("✅ PermissionsPage init");
    console.log("employeeDetails:", employeeDetails);
    console.log("employeeId:", employeeId);
    console.groupEnd();
  }, [employeeDetails, employeeId]);

  /**
   * Tipos de permisos (DEBE venir del servicio).
   * Se usa para:
   * - mostrar nombre del tipo en listados
   * - llenar el select de filtro por tipo
   */
  const { data: typesResp, isLoading: typesLoading } = useQuery<ApiResponse<PermissionType[]>>({
    queryKey: ["/api/v1/rh/permission-types"],
    queryFn: () => TiposPermisosAPI.list(),
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
  });

  const permissionTypes = useMemo(() => {
    const data = typesResp?.status === "success" ? typesResp.data ?? [] : [];
    return Array.isArray(data) ? data : [];
  }, [typesResp]);

  const typeNameById = useMemo(() => {
    return new Map<number, string>(permissionTypes.map((t) => [Number(t.typeId), String(t.name)]));
  }, [permissionTypes]);

  const getTypeName = (p: any) => resolvePermissionTypeName(p, typeNameById);

  // WORK_MINUTES_PER_DAY
  const { data: workdayParamResp } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/parameters", "by-name", "WORK_MINUTES_PER_DAY"],
    queryFn: () => ParametersAPI.getByName("WORK_MINUTES_PER_DAY"),
    refetchOnWindowFocus: false,
  });

  const workdayMinutes = useMemo(() => {
    if (workdayParamResp?.status !== "success") return 8 * 60;
    const minutes = extractParamMinutes(workdayParamResp.data);
    return minutes && minutes > 0 ? minutes : 8 * 60;
  }, [workdayParamResp]);

  // Directory parameters: HRPERMISSION
  const DIR_CODE = PERMISSION_DIRECTORY_CODE;
  const { data: dirResp, isLoading: dirLoading, isError: dirIsError } = useQuery<ApiResponse<any>>({
    queryKey: ["directory-params", DIR_CODE],
    queryFn: () => DirectoryParametersAPI.getByCode(DIR_CODE),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const dirParam = useMemo(() => normalizeDirParam(dirResp), [dirResp]);

  const documentsConfig: DocumentsConfig = useMemo(() => {
    return {
      directoryCode: dirParam?.code ?? DIR_CODE,
      entityType: PERMISSION_ENTITY_TYPE,
      relativePath: dirParam?.relativePath ?? "/hr-permissions/",
      accept: dirParam?.accept ?? ".pdf",
      maxSizeMB: dirParam?.maxSizeMb ?? 25,
      maxFiles: dirParam?.maxFiles ?? 10,
      documentType: { enabled: true, required: true },
    };
  }, [dirParam]);

  // Data
  const { data: permissionsResp, isLoading: permissionsLoading, refetch: refetchPermissions } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/permissions", "by-employee", employeeId],
    queryFn: async () => PermisosAPI.getByEmployee(employeeId),
    enabled: employeeId > 0,
    refetchOnWindowFocus: false,
  });

  const { data: vacationsResp, isLoading: vacationsLoading, refetch: refetchVacations } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/vacations", "by-employee", employeeId],
    queryFn: async () => VacacionesAPI.getByEmployee(employeeId),
    enabled: employeeId > 0,
    refetchOnWindowFocus: false,
  });

  const { data: balanceResp, isLoading: balanceLoading, refetch: refetchBalance } = useQuery<ApiResponse<any>>({
    queryKey: ["/api/v1/rh/timebalances", "by-employee", employeeId],
    queryFn: async () => TimeBalanceAPI.getByEmployee(employeeId),
    enabled: employeeId > 0,
    refetchOnWindowFocus: false,
  });

  const timeBalance = useMemo(() => extractTimeBalance(balanceResp), [balanceResp]);

  const permissions = useMemo(() => {
    const data = permissionsResp?.status === "success" ? permissionsResp.data ?? [] : [];
    return Array.isArray(data) ? data : [];
  }, [permissionsResp]);

  const vacations = useMemo(() => {
    const data = vacationsResp?.status === "success" ? vacationsResp.data ?? [] : [];
    return Array.isArray(data) ? data : [];
  }, [vacationsResp]);

  const permissionTypeOptions = useMemo(() => {
    return permissionTypes.map((t) => ({ value: String(t.typeId), label: t.name }));
  }, [permissionTypes]);

  const permissionStatusOptions = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p: any) => {
      const s = String(p?.status ?? "").trim();
      if (s) set.add(s);
    });
    const arr = Array.from(set);
    arr.sort();
    return arr;
  }, [permissions]);

  const vacationStatusOptions = useMemo(() => {
    const set = new Set<string>();
    vacations.forEach((v: any) => {
      const s = String(v?.status ?? v?.Status ?? "").trim();
      if (s) set.add(s);
    });
    const arr = Array.from(set);
    arr.sort();
    return arr;
  }, [vacations]);

  const inCurrentYear = (d?: string) => {
    if (!d) return false;
    const year = new Date(d).getFullYear();
    return year === currentYear;
  };

  const dateInRange = (d?: string, from?: string, to?: string) => {
    if (!d) return false;
    const x = dateOnly(d);
    if (from && x < from) return false;
    if (to && x > to) return false;
    return true;
  };

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return permissions.filter((p: any) => {
      const id = String(getPermissionId(p) ?? "");
      const typeName = String(getTypeName(p) ?? "").toLowerCase();
      const status = String(p?.status ?? "").toLowerCase();

      const start = p?.startDate ?? p?.StartDate;
      const end = p?.endDate ?? p?.EndDate ?? start;

      if (yearFilter === "CURRENT") {
        const ok = inCurrentYear(start) || inCurrentYear(end);
        if (!ok) return false;
      }

      if (typeFilter !== "ALL") {
        const pid = getPermissionTypeId(p);
        const byId = pid != null && String(pid) === typeFilter;
        if (!byId) return false;
      }

      if (statusFilter !== "ALL") {
        if (String(p?.status ?? "") !== statusFilter) return false;
      }

      if ((dateFrom || dateTo) && !dateInRange(start, dateFrom, dateTo)) return false;

      if (!q) return true;
      return id.includes(q) || typeName.includes(q) || status.includes(q);
    });
  }, [permissions, search, yearFilter, currentYear, typeFilter, statusFilter, dateFrom, dateTo, typeNameById]);

  const filteredVacations = useMemo(() => {
    const q = search.trim().toLowerCase();

    return vacations.filter((v: any) => {
      const id = String(v?.vacationId ?? v?.VacationId ?? v?.id ?? v?.ID ?? "");
      const status = String(v?.status ?? "").toLowerCase();
      const start = v?.startDate ?? v?.StartDate;
      const end = v?.endDate ?? v?.EndDate ?? start;

      if (yearFilter === "CURRENT") {
        const ok = inCurrentYear(start) || inCurrentYear(end);
        if (!ok) return false;
      }

      if (statusFilter !== "ALL") {
        if (String(v?.status ?? "") !== statusFilter) return false;
      }

      if ((dateFrom || dateTo) && !dateInRange(start, dateFrom, dateTo)) return false;

      if (!q) return true;
      return id.includes(q) || status.includes(q);
    });
  }, [vacations, search, yearFilter, currentYear, statusFilter, dateFrom, dateTo]);

  const openCreatePermission = () => {
    setEditingPermission(null);
    setIsPermissionFormOpen(true);
  };

  const openEditPermission = (p: any) => {
    setEditingPermission(p);
    setIsPermissionFormOpen(true);
  };

  const openCreateVacation = () => {
    setEditingVacation(null);
    setIsVacationFormOpen(true);
  };

  const openEditVacation = (v: any) => {
    setEditingVacation(v);
    setIsVacationFormOpen(true);
  };

  const onPermissionSaved = (isEdit: boolean) => {
    setIsPermissionFormOpen(false);
    setEditingPermission(null);
    refetchPermissions();
    refetchVacations();
    refetchBalance();
    toast({
      title: isEdit ? "Permiso actualizado" : "Permiso creado",
      description: "La solicitud fue registrada correctamente.",
    });
  };

  const onVacationSaved = (isEdit: boolean) => {
    setIsVacationFormOpen(false);
    setEditingVacation(null);
    refetchVacations();
    refetchPermissions();
    refetchBalance();
    toast({
      title: isEdit ? "Vacación actualizada" : "Vacación creada",
      description: "La solicitud fue registrada correctamente.",
    });
  };

  const clearFilters = () => {
    setSearch("");
    setYearFilter("CURRENT");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setDateFrom("");
    setDateTo("");
  };

  const BalanceCard = (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border bg-muted/20 p-2">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-semibold leading-none">Saldo de vacaciones</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Visible en <span className="font-medium">días / horas / minutos</span>.{" "}
              <span>(1 día = {Math.round(workdayMinutes / 60)}h)</span>
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              {dirLoading
                ? "Cargando parámetros HRPERMISSION..."
                : dirIsError
                ? "No se pudo cargar HRPERMISSION (usando valores por defecto)."
                : `HRPERMISSION → ext: ${dirParam?.accept ?? ".pdf"}, máx: ${dirParam?.maxSizeMb ?? 25}MB`}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-2 sm:justify-end">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Estado</div>
            <div className="text-sm font-medium">{balanceLoading ? "Cargando..." : "OK"}</div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchPermissions();
              refetchVacations();
              refetchBalance();
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refrescar
          </Button>
        </div>
      </div>

      {timeBalance ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <MetricCard
            title="Disponible"
            subtitle="Vacaciones"
            valueMinutes={timeBalance.vacationAvailableMin}
            workdayMinutes={workdayMinutes}
            emphasize
          />
          <MetricCard
            title="Recuperación pendiente"
            subtitle="Deuda por recuperar"
            valueMinutes={timeBalance.recoveryPendingMin}
            workdayMinutes={workdayMinutes}
          />
        </div>
      ) : (
        !balanceLoading && <div className="mt-3 text-sm text-muted-foreground">Sin datos de saldo.</div>
      )}
    </div>
  );

  const resultCountText =
    activeTab === "permissions"
      ? `Mostrando ${filteredPermissions.length} de ${permissions.length} permisos`
      : `Mostrando ${filteredVacations.length} de ${vacations.length} vacaciones`;

  const hasActiveFilters =
    !!search || yearFilter !== "CURRENT" || statusFilter !== "ALL" || typeFilter !== "ALL" || !!dateFrom || !!dateTo;

  const FiltersBar = (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-muted/20 px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border bg-background/80 p-2">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Filtros</div>
              <div className="text-xs text-muted-foreground">
                Busca y filtra {activeTab === "permissions" ? "permisos" : "vacaciones"} por estado, tipo y fechas
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {resultCountText}
            </Badge>

            <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters}>
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Búsqueda</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder={
                  activeTab === "permissions"
                    ? "Buscar por número, tipo o estado..."
                    : "Buscar por número o estado..."
                }
              />
            </div>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Período</label>
            <Select value={yearFilter} onValueChange={(value: "CURRENT" | "ALL") => setYearFilter(value)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CURRENT">Año actual</SelectItem>
                <SelectItem value="ALL">Todos los años</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                {(activeTab === "permissions" ? permissionStatusOptions : vacationStatusOptions).map((s) => (
                  <SelectItem key={s} value={s}>
                    {(activeTab === "permissions" ? permStatusLabels : vacStatusLabels)[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            {activeTab === "permissions" ? (
              <Select value={typeFilter} onValueChange={setTypeFilter} disabled={typesLoading}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={typesLoading ? "Cargando tipos..." : "Todos los tipos"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los tipos</SelectItem>
                  {permissionTypeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-10 items-center rounded-md border bg-muted/20 px-3 text-sm text-muted-foreground">
                No aplica en vacaciones
              </div>
            )}
          </div>

          <div className="xl:col-span-2 flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                refetchPermissions();
                refetchVacations();
                refetchBalance();
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/10 p-3">
          <div className="mb-3 text-xs font-medium text-muted-foreground">Rango de fechas</div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="flex items-end">
              <div className="w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {dateFrom || dateTo
                  ? `Filtrando ${
                      dateFrom ? `desde ${dateFrom}` : ""
                    } ${dateFrom && dateTo ? "hasta" : ""} ${dateTo ? dateTo : ""}`.trim()
                  : "Sin rango de fechas aplicado"}
              </div>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Filtros activos:</span>

            {!!search && <Badge variant="secondary" className="font-normal">Búsqueda: {search}</Badge>}

            {yearFilter !== "CURRENT" && <Badge variant="secondary" className="font-normal">Período: todos</Badge>}

            {statusFilter !== "ALL" && (
              <Badge variant="secondary" className="font-normal">
                Estado: {(activeTab === "permissions" ? permStatusLabels : vacStatusLabels)[statusFilter] ?? statusFilter}
              </Badge>
            )}

            {activeTab === "permissions" && typeFilter !== "ALL" && (
              <Badge variant="secondary" className="font-normal">
                Tipo: {permissionTypeOptions.find((t) => t.value === typeFilter)?.label ?? typeFilter}
              </Badge>
            )}

            {!!dateFrom && <Badge variant="secondary" className="font-normal">Desde: {dateFrom}</Badge>}
            {!!dateTo && <Badge variant="secondary" className="font-normal">Hasta: {dateTo}</Badge>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Permisos y Vacaciones</h1>
          <p className="text-sm text-muted-foreground">Gestión de solicitudes</p>
        </div>

        <div className="flex gap-2">
          {activeTab === "permissions" ? (
            <Button onClick={openCreatePermission} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nuevo permiso
            </Button>
          ) : (
            <Button onClick={openCreateVacation} className="w-full sm:w-auto">
              <Sun className="mr-2 h-4 w-4" /> Nueva vacación
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const next = v as "permissions" | "vacations";
          setActiveTab(next);
          setStatusFilter("ALL");
          if (next !== "permissions") setTypeFilter("ALL");
        }}
        className="space-y-4"
      >
        <div className="rounded-2xl border bg-card p-3 md:p-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
            <TabsTrigger value="vacations">Vacaciones</TabsTrigger>
          </TabsList>
        </div>

        <div className="space-y-4">
          {BalanceCard}
          {FiltersBar}

          <div className="rounded-2xl border bg-card p-3 md:p-4">
            <TabsContent value="permissions" className="m-0">
              {permissionsLoading ? (
                <div className="p-2 text-sm text-muted-foreground">Cargando permisos...</div>
              ) : (
                <>
                  <div className="grid max-h-[calc(100vh-380px)] grid-cols-1 gap-3 overflow-auto pr-1 md:hidden">
                    {filteredPermissions.map((p: any) => (
                      <div
                        key={String(getPermissionId(p) ?? `${p?.startDate}-${p?.endDate}-${Math.random()}`)}
                        className="rounded-xl border bg-background p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{getTypeName(p) || "Permiso"}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {fmtDate(p.startDate)} → {fmtDate(p.endDate ?? p.startDate)}
                            </div>
                          </div>
                          <Badge className={permStatusColors[String(p.status)] ?? "bg-muted text-foreground"}>
                            {permStatusLabels[String(p.status)] ?? p.status}
                          </Badge>
                        </div>

                        <div className="mt-3 flex gap-2">
                          {String(p.status) === "Pending" ? (
                            <Button variant="outline" className="w-full" onClick={() => openEditPermission(p)}>
                              Editar
                            </Button>
                          ) : (
                            <Button variant="outline" className="w-full" disabled>
                              Editar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!filteredPermissions.length && (
                      <div className="p-2 text-sm text-muted-foreground">
                        No existen permisos para los filtros actuales.
                      </div>
                    )}
                  </div>

                  <div className="hidden max-h-[calc(100vh-380px)] overflow-auto rounded-lg border md:block">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/30">
                        <tr className="text-left">
                          <th className="p-2">#</th>
                          <th className="p-2">Tipo</th>
                          <th className="p-2">Desde</th>
                          <th className="p-2">Hasta</th>
                          <th className="p-2">Estado</th>
                          <th className="p-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPermissions.map((p: any) => (
                          <tr
                            key={String(getPermissionId(p) ?? `${p?.startDate}-${p?.endDate}-${Math.random()}`)}
                            className="border-t"
                          >
                            <td className="p-2">#{getPermissionId(p) ?? "-"}</td>
                            <td className="p-2">{getTypeName(p) || "-"}</td>
                            <td className="p-2">{fmtDate(p.startDate)}</td>
                            <td className="p-2">{fmtDate(p.endDate ?? p.startDate)}</td>
                            <td className="p-2">
                              <Badge className={permStatusColors[String(p.status)] ?? "bg-muted text-foreground"}>
                                {permStatusLabels[String(p.status)] ?? p.status}
                              </Badge>
                            </td>
                            <td className="p-2">
                              {String(p.status) === "Pending" ? (
                                <Button variant="outline" size="sm" onClick={() => openEditPermission(p)}>
                                  Editar
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!filteredPermissions.length && (
                          <tr className="border-t">
                            <td className="p-3 text-sm text-muted-foreground" colSpan={6}>
                              No existen permisos para los filtros actuales.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="vacations" className="m-0">
              {vacationsLoading ? (
                <div className="p-2 text-sm text-muted-foreground">Cargando vacaciones...</div>
              ) : (
                <>
                  <div className="grid max-h-[calc(100vh-380px)] grid-cols-1 gap-3 overflow-auto pr-1 md:hidden">
                    {filteredVacations.map((v: any) => (
                      <div
                        key={String(v?.vacationId ?? v?.id ?? `${v?.startDate}-${v?.endDate}-${Math.random()}`)}
                        className="rounded-xl border bg-background p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">Vacación</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {fmtDate(v.startDate)} → {fmtDate(v.endDate ?? v.startDate)}
                            </div>
                          </div>
                          <Badge className={vacStatusColors[String(v.status)] ?? "bg-muted text-foreground"}>
                            {vacStatusLabels[String(v.status)] ?? v.status}
                          </Badge>
                        </div>

                        <div className="mt-3 flex gap-2">
                          {String(v.status) === "Planned" ? (
                            <Button variant="outline" className="w-full" onClick={() => openEditVacation(v)}>
                              Editar
                            </Button>
                          ) : (
                            <Button variant="outline" className="w-full" disabled>
                              Editar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!filteredVacations.length && (
                      <div className="p-2 text-sm text-muted-foreground">
                        No existen vacaciones para los filtros actuales.
                      </div>
                    )}
                  </div>

                  <div className="hidden max-h-[calc(100vh-380px)] overflow-auto rounded-lg border md:block">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/30">
                        <tr className="text-left">
                          <th className="p-2">#</th>
                          <th className="p-2">Desde</th>
                          <th className="p-2">Hasta</th>
                          <th className="p-2">Estado</th>
                          <th className="p-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVacations.map((v: any) => (
                          <tr
                            key={String(v?.vacationId ?? v?.id ?? `${v?.startDate}-${v?.endDate}-${Math.random()}`)}
                            className="border-t"
                          >
                            <td className="p-2">#{v?.vacationId ?? v?.id ?? "-"}</td>
                            <td className="p-2">{fmtDate(v.startDate)}</td>
                            <td className="p-2">{fmtDate(v.endDate ?? v.startDate)}</td>
                            <td className="p-2">
                              <Badge className={vacStatusColors[String(v.status)] ?? "bg-muted text-foreground"}>
                                {vacStatusLabels[String(v.status)] ?? v.status}
                              </Badge>
                            </td>
                            <td className="p-2">
                              {String(v.status) === "Planned" ? (
                                <Button variant="outline" size="sm" onClick={() => openEditVacation(v)}>
                                  Editar
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!filteredVacations.length && (
                          <tr className="border-t">
                            <td className="p-3 text-sm text-muted-foreground" colSpan={5}>
                              No existen vacaciones para los filtros actuales.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <Dialog
        open={isPermissionFormOpen}
        onOpenChange={(open) => {
          setIsPermissionFormOpen(open);
          if (!open) setEditingPermission(null);
        }}
      >
        <DialogContent
          className="max-h-[85vh] w-[95vw] max-w-3xl overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{editingPermission ? "Editar permiso" : "Nuevo permiso"}</DialogTitle>
            <DialogDescription>
              {editingPermission
                ? "Puedes editar mientras está pendiente."
                : "Completa los datos para registrar una nueva solicitud."}
            </DialogDescription>
          </DialogHeader>

          <PermissionForm
            key={editingPermission?.permissionId ?? editingPermission?.id ?? "new"}
            initialPermission={editingPermission}
            timeBalance={timeBalance}
            documents={documentsConfig}
            workMinutesPerDay={workdayMinutes}
            onSuccess={(edit) => onPermissionSaved(edit)}
            onCancel={() => {
              setIsPermissionFormOpen(false);
              setEditingPermission(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isVacationFormOpen}
        onOpenChange={(open) => {
          setIsVacationFormOpen(open);
          if (!open) setEditingVacation(null);
        }}
      >
        <DialogContent
          className="max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{editingVacation ? "Editar vacación" : "Nueva vacación"}</DialogTitle>
            <DialogDescription>
              {editingVacation
                ? "Puedes editar mientras está planificada."
                : "Completa los datos para registrar una nueva solicitud."}
            </DialogDescription>
          </DialogHeader>

          <VacationForm
            initialVacation={editingVacation}
            timeBalance={timeBalance}
            onSuccess={(edit) => onVacationSaved(edit)}
            onCancel={() => {
              setIsVacationFormOpen(false);
              setEditingVacation(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}