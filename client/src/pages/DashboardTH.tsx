// client/src/pages/DashboardTH.tsx
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip as UITooltip,
  TooltipTrigger as UITooltipTrigger,
  TooltipContent as UITooltipContent,
  TooltipProvider as UITooltipProvider,
} from "@/components/ui/tooltip";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandItem, CommandEmpty,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, Building2, Briefcase, RefreshCw,
  ChevronRight, UserCheck, FileText, Search, Loader2,
  TrendingUp, ShieldCheck, Check, ChevronsUpDown, Maximize2,
  Calendar, AlertTriangle, ScrollText,
} from "lucide-react";

import {
  VistaEmpleadosAPI,
  VwDepartmentWithTypeAPI,
  VwJobWithDegreeAndGroupAPI,
  VwAuthorityAPI,
  ContractsRHAPI,
  ContractTypeAPI,
} from "@/lib/api";
import { PersonnelActionsAPI } from "@/lib/api/services/contracts";

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeArray = (x: any): any[] =>
  Array.isArray(x) ? x
  : Array.isArray(x?.data) ? x.data
  : Array.isArray(x?.items) ? x.items
  : [];

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const COLORS = [
  "#818cf8", "#34d399", "#fbbf24", "#f87171",
  "#a78bfa", "#60a5fa", "#f472b6", "#2dd4bf",
  "#fb923c", "#a3e635",
];

const CURRENT_YEAR = new Date().getFullYear();

const EMP_TYPE_LABELS: Record<string, string> = {
  LOES: "Académico (LOES)",
  LOSEP: "Administrativo (LOSEP)",
  CT: "Código de Trabajo",
};
const empTypeLabel = (tipo: string) => EMP_TYPE_LABELS[tipo] ?? tipo;

// ─── Custom ticks — referencia de módulo (estable, sin re-renders) ───────────

const TickYCat = ({ x, y, payload, maxLen = 28 }: any) => {
  const raw = String(payload?.value ?? "");
  const label = raw.length > maxLen ? raw.slice(0, maxLen) + "…" : raw;
  return (
    <text x={x - 4} y={y} textAnchor="end" dominantBaseline="middle"
      style={{ fontSize: 11, fill: "var(--muted-foreground)" }}>
      <title>{raw}</title>
      {label}
    </text>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const name  = item.name  ?? item.payload?.name  ?? "—";
    const value = item.value ?? 0;
    const pct   = item.payload?.percent ?? item.percent ?? 0;
    return (
      <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md p-2.5 text-xs max-w-[220px]">
        <p className="font-semibold text-foreground truncate">{name}</p>
        <div className="mt-1 space-y-0.5">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Unidades:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{value}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Porcentaje:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{(pct * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomChartTooltip = ({ active, payload, label, unitSingular, unitPlural }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const titleName = label || data.name;
    const value = data.value;
    const unit = value === 1 ? unitSingular : unitPlural;
    return (
      <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md p-2.5 text-xs max-w-[280px]">
        <p className="font-semibold text-foreground truncate" title={titleName}>{titleName}</p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {value} {unit}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const TickXNum = ({ x, y, payload }: any) => (
  <text x={x} y={y + 4} textAnchor="middle"
    style={{ fontSize: 11, fill: "var(--muted-foreground)" }}>
    {payload?.value}
  </text>
);

const TickYNum = ({ x, y, payload }: any) => (
  <text x={x - 4} y={y} textAnchor="end" dominantBaseline="middle"
    style={{ fontSize: 11, fill: "var(--muted-foreground)" }}>
    {payload?.value}
  </text>
);

const TickXAngled = ({ x, y, payload }: any) => {
  const label = String(payload?.value ?? "").slice(0, 14);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" transform="rotate(-30)"
        style={{ fontSize: 10, fill: "var(--muted-foreground)" }}>
        {label}
      </text>
    </g>
  );
};

// ─── Loaders ─────────────────────────────────────────────────────────────────

function ChartLoader({ height = 220, label = "Cargando información..." }: { height?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height }}>
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      <span className="text-xs text-muted-foreground animate-pulse">{label}</span>
    </div>
  );
}

function TableLoader({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-10">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando…</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface DeptStat        { name: string; empleados: number }
interface JobGroup        { grupo: string; cargos: number }
interface ActionItem      { actionId: number; employeeFullName: string; actionTypeName: string; status: string; actionDate: string }
interface AuthItem        { departmentName: string; employeeFullName: string; authorityTypeName: string; jobDescription?: string | null; denomination?: string | null }
interface ContractStat    { name: string; total: number }
interface ExpiringContract { contractCode: string; laborRegimeName: string | null; endDate: string; days: number }

// ─── Componente ──────────────────────────────────────────────────────────────

export default function DashboardTH() {
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<"personal" | "contratos">("personal");
  const [authSearch, setAuthSearch]           = useState("");
  const [selectedEmpType, setSelectedEmpType] = useState<string>("Todos");
  const [actionView, setActionView]           = useState<"tipo" | "estado">("tipo");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedDeptTypeId, setSelectedDeptTypeId]     = useState<string>("Todos");
  const [selectedDeptScopeId, setSelectedDeptScopeId]   = useState<string>("Todos");
  const [deptComboOpen, setDeptComboOpen]     = useState(false);
  const [deptComboSearch, setDeptComboSearch] = useState("");
  const [deptExpandOpen, setDeptExpandOpen]   = useState(false);

  // Filtros tabla Contratos próximos a vencer
  const [contractRegimeFilter, setContractRegimeFilter]   = useState<string>("Todos");
  const [contractUrgencyFilter, setContractUrgencyFilter] = useState<number>(30);

  // Filtros tabla Acciones recientes
  const [actionTypeFilter, setActionTypeFilter]     = useState<string>("Todos");
  const [actionStatusFilter, setActionStatusFilter] = useState<string>("Todos");

  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const chartYAxisWidth  = isMobile ? 110 : isTablet ? 170 : 220;
  const chartMaxLabelLen = isMobile ? 14  : isTablet ? 24  : 32;
  const dialogYAxisWidth  = isMobile ? 110 : isTablet ? 200 : 280;
  const dialogMaxLabelLen = isMobile ? 14  : isTablet ? 28  : 42;

  // ── Queries — siempre activas (personal + acciones) ───────────────────────

  const { data: statsRes,   isLoading: loadingStats,   isFetching: fetchingStats,   refetch } =
    useQuery({ queryKey: ["th-stats"],       queryFn: () => VistaEmpleadosAPI.stats(),          staleTime: 3 * 60_000 });
  const { data: empRes,     isLoading: loadingEmp,     isFetching: fetchingEmp,     isError: isErrorEmp, refetch: refetchEmp } =
    useQuery({ queryKey: ["th-employees"],   queryFn: () => VistaEmpleadosAPI.list(),            staleTime: 3 * 60_000 });
  const { data: deptRes,    isLoading: loadingDept,    isFetching: fetchingDept,    isError: isErrorDept, refetch: refetchDept } =
    useQuery({ queryKey: ["th-departments"], queryFn: () => VwDepartmentWithTypeAPI.getActive(), staleTime: 5 * 60_000 });
  const { data: jobsRes,    isLoading: loadingJobs,    isFetching: fetchingJobs,    isError: isErrorJobs, refetch: refetchJobs } =
    useQuery({ queryKey: ["th-jobs"],        queryFn: () => VwJobWithDegreeAndGroupAPI.getAll(), staleTime: 10 * 60_000 });
  const { data: authRes,    isLoading: loadingAuth,    isFetching: fetchingAuth,    isError: isErrorAuth, refetch: refetchAuth } =
    useQuery({ queryKey: ["th-authorities"], queryFn: () => VwAuthorityAPI.getActive(),          staleTime: 5 * 60_000 });
  const { data: actionsRes, isLoading: loadingActions, isFetching: fetchingActions, isError: isErrorActions, refetch: refetchActions } =
    useQuery({
      queryKey: ["th-actions"],
      queryFn: () => PersonnelActionsAPI.getPaged({ pageSize: 100, page: 1 }),
      staleTime: 2 * 60_000,
      enabled: activeTab === "contratos",
    });

  // ── Queries lazy — solo se disparan al entrar a la pestaña Contratos ──────

  const { data: contractsRes,    isLoading: loadingContracts,     isFetching: fetchingContracts,     isError: isErrorContracts,     refetch: refetchContracts } =
    useQuery({
      queryKey: ["th-contracts", CURRENT_YEAR],
      queryFn: () => ContractsRHAPI.listPaged({ page: 1, pageSize: 500, year: CURRENT_YEAR, sortDirection: "asc" }),
      staleTime: 3 * 60_000,
      enabled: activeTab === "contratos",
    });
  const { data: contractTypesRes, isLoading: loadingContractTypes, isFetching: fetchingContractTypes, isError: isErrorContractTypes, refetch: refetchContractTypes } =
    useQuery({
      queryKey: ["th-contract-types"],
      queryFn: () => ContractTypeAPI.list(),
      staleTime: 10 * 60_000,
      enabled: activeTab === "contratos",
    });

  // ── Derivaciones: datos base ───────────────────────────────────────────────

  const stats       = useMemo(() => (statsRes as any)?.data ?? statsRes ?? null, [statsRes]);
  const employees   = useMemo(() => safeArray(empRes),  [empRes]);
  const departments = useMemo(() => safeArray(deptRes), [deptRes]);
  const allActions  = useMemo(() => safeArray((actionsRes as any)?.data ?? actionsRes), [actionsRes]);
  const allAuth     = useMemo(() => safeArray(authRes), [authRes]);
  const contracts   = useMemo(() => safeArray((contractsRes as any)?.data ?? contractsRes), [contractsRes]);
  const contractTypes = useMemo(() => safeArray(contractTypesRes), [contractTypesRes]);

  // ── Derivaciones: contratos ────────────────────────────────────────────────

  const contractTypeMap = useMemo(() => {
    const map = new Map<number, string>();
    contractTypes.forEach((t: any) => { if (t.contractTypeId != null) map.set(t.contractTypeId, t.name); });
    return map;
  }, [contractTypes]);

  const contractsTotalCount = useMemo(
    () => (contractsRes as any)?.data?.totalCount ?? contracts.length,
    [contractsRes, contracts]
  );

  const todayMs = useMemo(() => Date.now(), []);
  const in30Ms  = useMemo(() => todayMs + 30 * 24 * 60 * 60 * 1000, [todayMs]);

  const contractsExpiring = useMemo((): ExpiringContract[] =>
    contracts
      .filter((c: any) => {
        if (!c.endDate) return false;
        const t = new Date(c.endDate).getTime();
        return t >= todayMs && t <= in30Ms;
      })
      .map((c: any) => ({
        contractCode:    c.contractCode ?? "—",
        laborRegimeName: c.laborRegimeName ?? null,
        endDate:         c.endDate,
        days: Math.ceil((new Date(c.endDate).getTime() - todayMs) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => a.days - b.days),
    [contracts, todayMs, in30Ms]
  );

  const contractsExpiredCount = useMemo(
    () => contracts.filter((c: any) => c.endDate && new Date(c.endDate).getTime() < todayMs).length,
    [contracts, todayMs]
  );

  // Catálogos únicos para filtros de contratos
  const contractRegimeOptions = useMemo(() => {
    const set = new Set<string>();
    contractsExpiring.forEach((c) => { if (c.laborRegimeName) set.add(c.laborRegimeName); });
    return Array.from(set).sort();
  }, [contractsExpiring]);

  // Contratos filtrados por régimen y urgencia
  const contractsExpiringFiltered = useMemo(() =>
    contractsExpiring.filter((c) => {
      if (contractRegimeFilter !== "Todos" && c.laborRegimeName !== contractRegimeFilter) return false;
      if (c.days > contractUrgencyFilter) return false;
      return true;
    }),
    [contractsExpiring, contractRegimeFilter, contractUrgencyFilter]
  );

  const contractsByRegime = useMemo((): ContractStat[] => {
    const map: Record<string, number> = {};
    contracts.forEach((c: any) => {
      const k = c.laborRegimeName ?? "Sin régimen";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [contracts]);

  const contractsByType = useMemo((): ContractStat[] => {
    const map: Record<string, number> = {};
    contracts.forEach((c: any) => {
      const name = contractTypeMap.get(c.contractTypeID) ?? `Tipo #${c.contractTypeID}`;
      map[name] = (map[name] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [contracts, contractTypeMap]);

  // ── Derivaciones: personal ─────────────────────────────────────────────────

  const empTypes = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e: any) => { if (e.employeeTypeName) set.add(e.employeeTypeName); });
    return ["Todos", ...Array.from(set).sort()];
  }, [employees]);

  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

  const deptByName = useMemo(() => {
    const map = new Map<string, any>();
    departments.forEach((d: any) => map.set(norm(d.departmentName), d));
    return map;
  }, [departments]);

  const deptTypeOptions = useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach((d: any) => { if (d.departmentTypeID != null) map.set(d.departmentTypeID, d.departmentTypeName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const deptScopeOptions = useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach((d: any) => { if (d.departmentScopeID != null) map.set(d.departmentScopeID, d.departmentScopeName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const departmentOptions = useMemo(() => {
    let list = departments;
    if (selectedDeptTypeId !== "Todos") list = list.filter((d: any) => d.departmentTypeID === Number(selectedDeptTypeId));
    if (selectedDeptScopeId !== "Todos") list = list.filter((d: any) => d.departmentScopeID === Number(selectedDeptScopeId));
    return [...list].sort((a: any, b: any) => a.departmentName.localeCompare(b.departmentName));
  }, [departments, selectedDeptTypeId, selectedDeptScopeId]);

  const activeFiltered = useMemo(() =>
    employees.filter((e: any) => {
      if (!e.employeeIsActive) return false;
      if (selectedEmpType !== "Todos" && e.employeeTypeName !== selectedEmpType) return false;
      const dept = deptByName.get(norm(e.department));
      if (selectedDeptTypeId !== "Todos" && dept?.departmentTypeID !== Number(selectedDeptTypeId)) return false;
      if (selectedDeptScopeId !== "Todos" && dept?.departmentScopeID !== Number(selectedDeptScopeId)) return false;
      if (selectedDepartmentId != null && dept?.departmentID !== selectedDepartmentId) return false;
      return true;
    }),
    [employees, selectedEmpType, selectedDepartmentId, selectedDeptTypeId, selectedDeptScopeId, deptByName]
  );

  const deptTypeDist = useMemo(() => {
    const map: Record<string, number> = {};
    departments.forEach((d: any) => {
      const t = d.departmentTypeName ?? "Sin tipo";
      map[t] = (map[t] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [departments]);

  const byDepartmentAll = useMemo((): DeptStat[] => {
    const map: Record<string, number> = {};
    activeFiltered.forEach((e: any) => {
      const k = (e.department ?? "").trim() || "Sin departamento";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, empleados]) => ({ name, empleados }))
      .sort((a, b) => b.empleados - a.empleados);
  }, [activeFiltered]);

  const byDepartment = useMemo(() => byDepartmentAll.slice(0, 12), [byDepartmentAll]);

  const jobsByGroup = useMemo((): JobGroup[] => {
    const map: Record<string, number> = {};
    safeArray(jobsRes).forEach((j: any) => {
      const k = j.occupationalGroup ?? "Sin grupo";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([grupo, cargos]) => ({ grupo, cargos }))
      .sort((a, b) => b.cargos - a.cargos);
  }, [jobsRes]);

  // ── Derivaciones: acciones ─────────────────────────────────────────────────

  const actionsByType = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const iso = start.toISOString();
    const map: Record<string, number> = {};
    allActions.forEach((a: any) => {
      if ((a.actionDate ?? "") < iso) return;
      const k = a.actionTypeName ?? "Otro";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).map(([tipo, total]) => ({ tipo, total }));
  }, [allActions]);

  const actionsByStatus = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const iso = start.toISOString();
    const map: Record<string, number> = {};
    allActions.forEach((a: any) => {
      if ((a.actionDate ?? "") < iso) return;
      const k = a.status ?? "Sin estado";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).map(([estado, total]) => ({ estado, total })).sort((a, b) => b.total - a.total);
  }, [allActions]);

  const allRecentActions = useMemo((): ActionItem[] =>
    allActions.slice(0, 20).map((a: any) => ({
      actionId:         a.actionId ?? a.id,
      employeeFullName: a.employeeFullName ?? "—",
      actionTypeName:   a.actionTypeName ?? "—",
      status:           a.status ?? "—",
      actionDate:       a.actionDate ?? "",
    })),
    [allActions]
  );

  // Catálogos únicos para filtros de acciones
  const actionTypeOptions = useMemo(() => {
    const set = new Set<string>();
    allRecentActions.forEach((a) => { if (a.actionTypeName !== "—") set.add(a.actionTypeName); });
    return Array.from(set).sort();
  }, [allRecentActions]);

  const actionStatusOptions = useMemo(() => {
    const set = new Set<string>();
    allRecentActions.forEach((a) => { if (a.status !== "—") set.add(a.status); });
    return Array.from(set).sort();
  }, [allRecentActions]);

  const recentActions = useMemo(() =>
    allRecentActions.filter((a) => {
      if (actionTypeFilter !== "Todos" && a.actionTypeName !== actionTypeFilter) return false;
      if (actionStatusFilter !== "Todos" && a.status !== actionStatusFilter) return false;
      return true;
    }),
    [allRecentActions, actionTypeFilter, actionStatusFilter]
  );

  // ── Derivaciones: autoridades ──────────────────────────────────────────────

  const authorities = useMemo((): AuthItem[] => {
    const lower = authSearch.toLowerCase();
    return allAuth
      .filter((a: any) =>
        !authSearch ||
        (a.departmentName ?? "").toLowerCase().includes(lower) ||
        (a.employeeFullName ?? "").toLowerCase().includes(lower)
      )
      .map((a: any) => ({
        departmentName:    a.departmentName ?? "—",
        employeeFullName:  a.employeeFullName ?? "—",
        authorityTypeName: a.authorityTypeName ?? "—",
        jobDescription:    a.jobDescription ?? null,
        denomination:      a.denomination ?? null,
      }))
      .slice(0, 50);
  }, [allAuth, authSearch]);

  const authByType = useMemo(() => {
    const map: Record<string, number> = {};
    allAuth.forEach((a: any) => {
      const k = a.authorityTypeName ?? "Sin tipo";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total);
  }, [allAuth]);

  // ── KPIs globales ──────────────────────────────────────────────────────────

  const kpiActive   = stats?.active   ?? 0;
  const kpiInactive = stats?.inactive ?? 0;
  const kpiActions  = (actionsRes as any)?.data?.totalCount ?? allActions.length;
  const kpiAuth     = allAuth.length;

  const isLoading  = loadingStats || loadingEmp || loadingDept || loadingJobs;
  const isFetching = fetchingStats || fetchingEmp || fetchingDept || fetchingJobs || fetchingAuth || fetchingActions;
  const isLoadingContracts  = loadingContracts || loadingContractTypes;
  const isFetchingContracts = fetchingContracts || fetchingContractTypes;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6 space-y-6">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard Talento Humano</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("es-EC", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* ── KPIs globales — siempre visibles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {([
          { label: "Empleados activos",   value: kpiActive,   loading: loadingStats || fetchingStats, icon: UserCheck,   iconCls: "text-indigo-500 dark:text-indigo-400",   bgCls: "bg-indigo-500/10 dark:bg-indigo-500/20" },
          { label: "Empleados inactivos", value: kpiInactive, loading: loadingStats || fetchingStats, icon: Users,       iconCls: "text-muted-foreground",                  bgCls: "bg-muted" },
          { label: "Autoridades activas", value: kpiAuth,     loading: loadingAuth || fetchingAuth,   icon: ShieldCheck, iconCls: "text-emerald-500 dark:text-emerald-400", bgCls: "bg-emerald-500/10 dark:bg-emerald-500/20" },
        ] as const).map(({ label, value, loading, icon: Icon, iconCls, bgCls }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  {loading
                    ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                    : <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">{(value as number).toLocaleString()}</p>
                  }
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${bgCls} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconCls}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Pestañas principales ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="personal" className="text-xs sm:text-sm gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Gestión de Personal</span>
            <span className="sm:hidden">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="contratos" className="text-xs sm:text-sm gap-1.5">
            <ScrollText className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Contratos y Acción de Personal</span>
            <span className="sm:hidden">Contratos / Acciones</span>
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — Gestión de Personal
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="personal" className="space-y-4 mt-4">

          {/* Estructura organizacional */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Estructura organizacional
                </CardTitle>
                <CardDescription>Unidades activas agrupadas por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDept || fetchingDept ? (
                  <ChartLoader height={220} />
                ) : isErrorDept ? (
                  <div className="h-[220px] flex flex-col items-center justify-center text-destructive text-sm gap-2">
                    <span>Error al cargar información</span>
                    <Button size="sm" variant="outline" onClick={() => refetchDept()}>Reintentar</Button>
                  </div>
                ) : deptTypeDist.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                    No hay información disponible
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart margin={{ top: 16, right: 48, bottom: 16, left: 48 }}>
                      <Pie data={deptTypeDist} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={70} innerRadius={30} paddingAngle={2}
                        label={({ cx, cy, midAngle, outerRadius, percent }) => {
                          const RAD = Math.PI / 180;
                          const angle = midAngle ?? 0;
                          const r = outerRadius + 14;
                          const x = cx + r * Math.cos(-angle * RAD);
                          const y = cy + r * Math.sin(-angle * RAD);
                          return (
                            <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="middle"
                              style={{ fontSize: 11, fill: "var(--foreground)" }}>
                              {`${((percent ?? 0) * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                        labelLine={false}
                      >
                        {deptTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend iconType="circle" iconSize={8}
                        formatter={(val) => <span style={{ fontSize: 11, color: "var(--foreground)" }}>{val}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Unidades activas</CardTitle>
                    <CardDescription>Código · Nombre · Tipo · Ámbito</CardDescription>
                  </div>
                  {!(loadingDept || fetchingDept) && !isErrorDept &&
                    <Badge variant="secondary">{departments.length} unidades</Badge>}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[260px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Código</TableHead>
                        <TableHead className="text-xs">Nombre</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Ámbito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDept || fetchingDept ? (
                        <TableLoader cols={4} />
                      ) : isErrorDept ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center">
                            <div className="flex flex-col items-center gap-2 text-destructive text-sm">
                              <span>Error al cargar unidades</span>
                              <Button size="sm" variant="outline" onClick={() => refetchDept()}>Reintentar</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : departments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No hay información disponible
                          </TableCell>
                        </TableRow>
                      ) : departments.slice(0, 30).map((d: any, i: number) => (
                        <TableRow key={d.departmentID ?? i}>
                          <TableCell className="font-mono text-xs">{d.code ?? "—"}</TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate" title={d.departmentName}>{d.departmentName}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{d.departmentTypeName ?? "—"}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{d.departmentScopeName ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribución de personal activo */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Distribución de personal activo
                  </CardTitle>
                  <CardDescription>
                    {loadingEmp
                      ? "Calculando…"
                      : `${activeFiltered.length.toLocaleString()} empleados${selectedEmpType !== "Todos" ? ` · ${empTypeLabel(selectedEmpType)}` : ""}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setDeptExpandOpen(true)} disabled={byDepartmentAll.length === 0}>
                    <Maximize2 className="h-3.5 w-3.5 mr-1.5" /> Expandir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/employees")}>
                    Ver todos <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>

              {!loadingDept && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Select value={selectedDeptTypeId} onValueChange={(v) => { setSelectedDeptTypeId(v); setSelectedDepartmentId(null); }}>
                    <SelectTrigger className="h-8 w-full sm:w-44 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos los tipos</SelectItem>
                      {deptTypeOptions.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={selectedDeptScopeId} onValueChange={(v) => { setSelectedDeptScopeId(v); setSelectedDepartmentId(null); }}>
                    <SelectTrigger className="h-8 w-full sm:w-44 text-xs"><SelectValue placeholder="Ámbito" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos los ámbitos</SelectItem>
                      {deptScopeOptions.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Popover open={deptComboOpen} onOpenChange={(v) => { setDeptComboOpen(v); if (!v) setDeptComboSearch(""); }}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" role="combobox"
                        className="h-8 w-full sm:w-64 justify-between font-normal text-xs">
                        <span className={`truncate text-left flex-1 ${selectedDepartmentId == null ? "text-muted-foreground" : ""}`}>
                          {selectedDepartmentId == null
                            ? "Todos los departamentos"
                            : departmentOptions.find((d: any) => d.departmentID === selectedDepartmentId)?.departmentName ?? "Departamento"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" side="bottom">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Buscar departamento…" value={deptComboSearch} onValueChange={setDeptComboSearch} />
                        <CommandList>
                          <CommandItem value="__none__" onSelect={() => { setSelectedDepartmentId(null); setDeptComboOpen(false); }}
                            className="cursor-pointer italic text-muted-foreground">
                            <Check className={`mr-2 h-4 w-4 shrink-0 ${selectedDepartmentId == null ? "opacity-100" : "opacity-0"}`} />
                            Todos los departamentos
                          </CommandItem>
                          {(() => {
                            const term = deptComboSearch.toLowerCase().trim();
                            const filtered = !term ? departmentOptions
                              : departmentOptions.filter((d: any) =>
                                  d.departmentName.toLowerCase().includes(term) ||
                                  (d.departmentTypeName?.toLowerCase().includes(term) ?? false) ||
                                  (d.departmentScopeName?.toLowerCase().includes(term) ?? false));
                            if (filtered.length === 0) return <CommandEmpty>Sin resultados para "{deptComboSearch}".</CommandEmpty>;
                            return filtered.map((d: any) => (
                              <CommandItem key={d.departmentID} value={String(d.departmentID)} className="cursor-pointer"
                                onSelect={() => { setSelectedDepartmentId(d.departmentID); setDeptComboOpen(false); setDeptComboSearch(""); }}>
                                <Check className={`mr-2 h-4 w-4 shrink-0 ${selectedDepartmentId === d.departmentID ? "opacity-100" : "opacity-0"}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{d.departmentName}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {d.departmentTypeName ?? "Sin tipo"} · {d.departmentScopeName ?? "Sin ámbito"}
                                  </p>
                                </div>
                              </CommandItem>
                            ));
                          })()}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {!loadingEmp && empTypes.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {empTypes.map((tipo) => (
                    <button key={tipo} onClick={() => setSelectedEmpType(tipo)}
                      className={[
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                        selectedEmpType === tipo
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted",
                      ].join(" ")}>
                      {tipo === "Todos" ? tipo : empTypeLabel(tipo)}
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent>
              {(loadingEmp || fetchingEmp || loadingDept || fetchingDept) ? (
                <ChartLoader height={300} />
              ) : (isErrorEmp || isErrorDept) ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-destructive text-sm gap-2">
                  <span>Error al cargar información</span>
                  <Button size="sm" variant="outline" onClick={() => { refetchEmp(); refetchDept(); }}>Reintentar</Button>
                </div>
              ) : byDepartment.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm text-center">
                  No hay información disponible para los filtros seleccionados
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_160px] gap-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={byDepartment} layout="vertical" margin={{ left: 0, right: 36, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={TickXNum} />
                      <YAxis type="category" dataKey="name" width={chartYAxisWidth}
                        tick={(props: any) => <TickYCat {...props} maxLen={chartMaxLabelLen} />} interval={0} />
                      <Tooltip content={<CustomChartTooltip unitSingular="empleado" unitPlural="empleados" />}
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
                      <Bar dataKey="empleados" radius={[0, 5, 5, 0]} maxBarSize={20}>
                        {byDepartment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <UITooltipProvider>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:flex xl:flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                      {byDepartment.map((d, i) => (
                        <UITooltip key={d.name}>
                          <UITooltipTrigger asChild>
                            <div className="flex items-center gap-2 min-w-0 cursor-default hover:bg-muted/50 p-1 rounded transition-colors">
                              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-xs text-muted-foreground truncate flex-1">{d.name}</span>
                              <span className="text-xs font-semibold tabular-nums">{d.empleados}</span>
                            </div>
                          </UITooltipTrigger>
                          <UITooltipContent side="top" className="max-w-[280px]">
                            <p className="font-semibold text-xs text-foreground">{d.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{d.empleados} {d.empleados === 1 ? "empleado" : "empleados"}</p>
                          </UITooltipContent>
                        </UITooltip>
                      ))}
                    </div>
                  </UITooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cargos por grupo ocupacional */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Cargos por grupo ocupacional
              </CardTitle>
              <CardDescription>Total de cargos por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingJobs || fetchingJobs ? (
                <ChartLoader height={240} />
              ) : isErrorJobs ? (
                <div className="h-[240px] flex flex-col items-center justify-center text-destructive text-sm gap-2">
                  <span>Error al cargar información</span>
                  <Button size="sm" variant="outline" onClick={() => refetchJobs()}>Reintentar</Button>
                </div>
              ) : jobsByGroup.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  No hay información disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={jobsByGroup} margin={{ left: 4, right: 12, top: 4, bottom: 52 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="grupo" tick={TickXAngled} interval={0} />
                    <YAxis tick={TickYNum} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip unitSingular="cargo" unitPlural="cargos" />}
                      cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
                    <Bar dataKey="cargos" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {jobsByGroup.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Autoridades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Autoridades por tipo
                </CardTitle>
                <CardDescription>Distribución de cargos de autoridad activos</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAuth || fetchingAuth ? (
                  <ChartLoader height={200} />
                ) : isErrorAuth ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-destructive text-sm gap-2">
                    <span>Error al cargar información</span>
                    <Button size="sm" variant="outline" onClick={() => refetchAuth()}>Reintentar</Button>
                  </div>
                ) : authByType.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 opacity-25" />
                    <p className="text-sm">Sin autoridades configuradas</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, authByType.length * 44)}>
                    <BarChart data={authByType} layout="vertical" margin={{ left: 0, right: 32, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={TickXNum} allowDecimals={false} />
                      <YAxis type="category" dataKey="tipo" width={170} tick={TickYCat} />
                      <Tooltip content={<CustomChartTooltip unitSingular="autoridad" unitPlural="autoridades" />}
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
                      <Bar dataKey="total" radius={[0, 5, 5, 0]} maxBarSize={28}>
                        {authByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="h-4 w-4" /> Directorio de autoridades
                    </CardTitle>
                    <CardDescription>Decanos, directores y responsables</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-52">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Buscar…" value={authSearch} onChange={(e) => setAuthSearch(e.target.value)}
                      className="h-8 text-sm pl-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Unidad</TableHead>
                        <TableHead className="text-xs">Autoridad</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Cargo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAuth || fetchingAuth ? <TableLoader cols={4} /> : isErrorAuth ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center">
                            <div className="flex flex-col items-center gap-2 text-destructive text-sm">
                              <span>Error al cargar autoridades</span>
                              <Button size="sm" variant="outline" onClick={() => refetchAuth()}>Reintentar</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : authorities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <ShieldCheck className="h-8 w-8 opacity-25" />
                              <p className="text-sm">{authSearch ? "Sin resultados para la búsqueda" : "Sin autoridades activas registradas"}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : authorities.map((a, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium max-w-[130px] truncate" title={a.departmentName}>{a.departmentName}</TableCell>
                          <TableCell className="text-xs max-w-[130px] truncate" title={a.employeeFullName}>{a.employeeFullName}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs whitespace-nowrap">{a.authorityTypeName}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[110px] truncate">
                            {a.denomination ?? a.jobDescription ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — Contratos y Acción de Personal (lazy)
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="contratos" className="space-y-4 mt-4">

          <SectionDivider label="Contratos" />

          {/* KPIs de contratos + acciones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {([
              {
                label: `Contratos ${CURRENT_YEAR}`,
                value: contractsTotalCount,
                icon: ScrollText,
                iconCls: "text-indigo-500 dark:text-indigo-400",
                bgCls: "bg-indigo-500/10 dark:bg-indigo-500/20",
              },
              {
                label: "Próximos a vencer (30 días)",
                value: contractsExpiring.length,
                icon: AlertTriangle,
                iconCls: contractsExpiring.length > 0 ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground",
                bgCls: contractsExpiring.length > 0 ? "bg-amber-500/10 dark:bg-amber-500/20" : "bg-muted",
              },
              {
                label: "Contratos vencidos",
                value: contractsExpiredCount,
                icon: Calendar,
                iconCls: contractsExpiredCount > 0 ? "text-rose-500 dark:text-rose-400" : "text-muted-foreground",
                bgCls: contractsExpiredCount > 0 ? "bg-rose-500/10 dark:bg-rose-500/20" : "bg-muted",
                loadingOverride: null,
              },
              {
                label: "Acciones de personal",
                value: kpiActions,
                icon: FileText,
                iconCls: "text-amber-500 dark:text-amber-400",
                bgCls: "bg-amber-500/10 dark:bg-amber-500/20",
                loadingOverride: loadingActions || fetchingActions,
              },
            ]).map(({ label, value, icon: Icon, iconCls, bgCls, loadingOverride }) => (
              <Card key={label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{label}</p>
                      {(loadingOverride ?? (isLoadingContracts || isFetchingContracts))
                        ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                        : <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">{(value as number).toLocaleString()}</p>
                      }
                    </div>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${bgCls} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconCls}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gráficos: por régimen y por tipo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ScrollText className="h-4 w-4" /> Por régimen laboral
                </CardTitle>
                <CardDescription>LOES · LOSEP · Código de Trabajo</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingContracts || isFetchingContracts ? (
                  <ChartLoader height={200} />
                ) : isErrorContracts ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-destructive text-sm gap-2">
                    <span>Error al cargar información</span>
                    <Button size="sm" variant="outline" onClick={() => refetchContracts()}>Reintentar</Button>
                  </div>
                ) : contractsByRegime.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No hay contratos registrados para este período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, contractsByRegime.length * 52)}>
                    <BarChart data={contractsByRegime} layout="vertical" margin={{ left: 0, right: 36, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={TickXNum} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={180} tick={TickYCat} interval={0} />
                      <Tooltip content={<CustomChartTooltip unitSingular="contrato" unitPlural="contratos" />}
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
                      <Bar dataKey="total" radius={[0, 5, 5, 0]} maxBarSize={32}>
                        {contractsByRegime.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Por tipo de contrato
                </CardTitle>
                <CardDescription>Distribución según tipo de contrato configurado</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingContracts || isFetchingContracts ? (
                  <ChartLoader height={200} />
                ) : isErrorContracts || isErrorContractTypes ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-destructive text-sm gap-2">
                    <span>Error al cargar información</span>
                    <Button size="sm" variant="outline" onClick={() => { refetchContracts(); refetchContractTypes(); }}>Reintentar</Button>
                  </div>
                ) : contractsByType.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No hay contratos registrados para este período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, contractsByType.length * 52)}>
                    <BarChart data={contractsByType} layout="vertical" margin={{ left: 0, right: 36, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={TickXNum} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={200} tick={TickYCat} interval={0} />
                      <Tooltip content={<CustomChartTooltip unitSingular="contrato" unitPlural="contratos" />}
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
                      <Bar dataKey="total" radius={[0, 5, 5, 0]} maxBarSize={32}>
                        {contractsByType.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabla alertas: próximos a vencer */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Contratos próximos a vencer
                  </CardTitle>
                  <CardDescription>
                    {contractsExpiringFiltered.length} contratos · ordenados por urgencia
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/contracts")}>
                  Ver todos <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              {/* Filtros */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Select value={contractRegimeFilter} onValueChange={setContractRegimeFilter}>
                  <SelectTrigger className="h-8 w-full sm:w-44 text-xs"><SelectValue placeholder="Régimen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos los regímenes</SelectItem>
                    {contractRegimeOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  {([30, 15, 7] as const).map((days) => (
                    <button key={days} onClick={() => setContractUrgencyFilter(days)}
                      className={[
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                        contractUrgencyFilter === days
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted",
                      ].join(" ")}>
                      ≤ {days}d
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Código contrato</TableHead>
                      <TableHead className="text-xs">Régimen</TableHead>
                      <TableHead className="text-xs">Fecha vencimiento</TableHead>
                      <TableHead className="text-xs text-right">Días restantes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingContracts || isFetchingContracts ? (
                      <TableLoader cols={4} />
                    ) : isErrorContracts ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center">
                          <div className="flex flex-col items-center gap-2 text-destructive text-sm">
                            <span>Error al cargar contratos</span>
                            <Button size="sm" variant="outline" onClick={() => refetchContracts()}>Reintentar</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : contractsExpiringFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground text-sm">
                          {contractsExpiring.length === 0
                            ? "No hay contratos próximos a vencer en los siguientes 30 días"
                            : "Sin resultados para los filtros seleccionados"}
                        </TableCell>
                      </TableRow>
                    ) : contractsExpiringFiltered.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{c.contractCode}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{c.laborRegimeName ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(c.endDate)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`text-xs font-semibold tabular-nums ${
                            c.days <= 7 ? "text-rose-500 dark:text-rose-400"
                            : c.days <= 15 ? "text-amber-500 dark:text-amber-400"
                            : "text-muted-foreground"}`}>
                            {c.days} {c.days === 1 ? "día" : "días"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <SectionDivider label="Acción de Personal" />

          {/* Acciones este mes */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Acciones este mes
                  </CardTitle>
                  <CardDescription>Distribución por tipo y estado</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant={actionView === "tipo" ? "default" : "ghost"}
                    className="h-7 text-xs px-3" onClick={() => setActionView("tipo")}>
                    Por tipo
                  </Button>
                  <Button size="sm" variant={actionView === "estado" ? "default" : "ghost"}
                    className="h-7 text-xs px-3" onClick={() => setActionView("estado")}>
                    Por estado
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/personnel-actions")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingActions || fetchingActions ? (
                <ChartLoader height={240} />
              ) : isErrorActions ? (
                <div className="h-[240px] flex flex-col items-center justify-center text-destructive text-sm gap-2">
                  <span>Error al cargar información</span>
                  <Button size="sm" variant="outline" onClick={() => refetchActions()}>Reintentar</Button>
                </div>
              ) : actionView === "tipo" ? (
                actionsByType.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    No hay acciones registradas este mes
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={actionsByType} margin={{ left: 4, right: 8, top: 4, bottom: 52 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="tipo" tick={TickXAngled} interval={0} />
                      <YAxis tick={TickYNum} allowDecimals={false} />
                      <Tooltip content={<CustomChartTooltip unitSingular="acción" unitPlural="acciones" />}
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={32}>
                        {actionsByType.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : actionsByStatus.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  No hay acciones registradas este mes
                </div>
              ) : (
                <div className="space-y-3 pt-1 h-[240px] overflow-y-auto pr-1">
                  {actionsByStatus.map((s, i) => {
                    const max = actionsByStatus[0]?.total ?? 1;
                    const pct = Math.round((s.total / max) * 100);
                    return (
                      <div key={s.estado} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[200px]" title={s.estado}>{s.estado}</span>
                          <span className="font-semibold tabular-nums ml-2">{s.total}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones recientes */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Acciones de personal recientes</CardTitle>
                  <CardDescription>{recentActions.length} acciones</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/personnel-actions")}>
                  Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              {/* Filtros */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                  <SelectTrigger className="h-8 w-full sm:w-52 text-xs"><SelectValue placeholder="Tipo de acción" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos los tipos</SelectItem>
                    {actionTypeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={actionStatusFilter} onValueChange={setActionStatusFilter}>
                  <SelectTrigger className="h-8 w-full sm:w-44 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos los estados</SelectItem>
                    {actionStatusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(actionTypeFilter !== "Todos" || actionStatusFilter !== "Todos") && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
                    onClick={() => { setActionTypeFilter("Todos"); setActionStatusFilter("Todos"); }}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingActions || fetchingActions ? (
                      <TableLoader cols={4} />
                    ) : isErrorActions ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center">
                          <div className="flex flex-col items-center gap-2 text-destructive text-sm">
                            <span>Error al cargar acciones</span>
                            <Button size="sm" variant="outline" onClick={() => refetchActions()}>Reintentar</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : recentActions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No hay acciones registradas
                        </TableCell>
                      </TableRow>
                    ) : recentActions.map((a, i) => (
                      <TableRow key={a.actionId ?? i}>
                        <TableCell className="font-medium text-sm">{a.employeeFullName}</TableCell>
                        <TableCell className="text-sm">{a.actionTypeName}</TableCell>
                        <TableCell>
                          <Badge variant={a.status?.toLowerCase().includes("aprob") ? "default" : "secondary"} className="text-xs">
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(a.actionDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

      {/* Dialog expandir distribución — fuera de Tabs para que no se desmonte al cambiar pestaña */}
      <Dialog open={deptExpandOpen} onOpenChange={setDeptExpandOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Distribución de personal por departamento</DialogTitle>
            <DialogDescription>
              {byDepartmentAll.length} departamentos · {activeFiltered.length.toLocaleString()} empleados
              {selectedEmpType !== "Todos" ? ` · ${empTypeLabel(selectedEmpType)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-1 px-1">
            {(loadingEmp || fetchingEmp || loadingDept || fetchingDept) ? (
              <ChartLoader height={300} />
            ) : (isErrorEmp || isErrorDept) ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-destructive text-sm gap-2">
                <span>Error al cargar información</span>
                <Button size="sm" variant="outline" onClick={() => { refetchEmp(); refetchDept(); }}>Reintentar</Button>
              </div>
            ) : byDepartmentAll.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm text-center">
                No hay información disponible para los filtros seleccionados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, byDepartmentAll.length * 32)}>
                <BarChart data={byDepartmentAll} layout="vertical" margin={{ left: 0, right: 36, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={TickXNum} />
                  <YAxis type="category" dataKey="name" width={dialogYAxisWidth}
                    tick={(props: any) => <TickYCat {...props} maxLen={dialogMaxLabelLen} />} interval={0} />
                  <Tooltip content={<CustomChartTooltip unitSingular="empleado" unitPlural="empleados" />}
                    cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
                  <Bar dataKey="empleados" radius={[0, 5, 5, 0]} maxBarSize={20}>
                    {byDepartmentAll.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
