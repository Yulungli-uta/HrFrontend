// src/pages/Overtime.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, ChevronDown, Eye, RefreshCw, Filter, CheckCircle, Plus, Users, DollarSign, Clock, TimerReset
} from "lucide-react";

import {
  TimePlanningsAPI,
  TimePlanningEmployeesAPI,
  TiposReferenciaAPI,
  ConfigHorasExtrasAPI,
  DirectoryParametersAPI,
  type ApiResponse,
} from "@/lib/api";

import TimePlanningEmployeeForm from "@/components/forms/TimePlanningEmployeeForm";

/* ---------------- Helpers y tipos ---------------- */

type TimePlanning = {
  planID: number;
  planType: "Overtime" | "Recovery"; // lo que devuelve el backend
  title: string;
  description?: string;
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  startTime: string;      // HH:mm:ss
  endTime: string;        // HH:mm:ss
  overtimeType?: string | null; // EXACTO según HR.tbl_OvertimeConfig.OvertimeType
  factor?: number | null;
  owedMinutes?: number | null;
  planStatusTypeID: number;
  requiresApproval: boolean;
  createdBy: number;
  createdAt: string;
  updatedBy?: number | null;
  updatedAt?: string | null;
};

type RefType = { typeId: number; category: string; name: string; description?: string; isActive: boolean; };

type PlanningEmployeeRow = {
  planEmployeeID: number;
  planID: number;
  employeeID: number;
  assignedHours?: number;
  assignedMinutes?: number;
  actualHours?: number;
  actualMinutes?: number;
  paymentAmount?: number;
  isEligible: boolean;
  employeeStatusTypeID: number;
};

const toMinutes = (hours?: number, minutes?: number) => {
  if (typeof hours === "number") return Math.round(hours * 60);
  return minutes ?? 0;
};
const fmtMoney = (n?: number) => (typeof n === "number" ? `$${n.toLocaleString()}` : "—");
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const fmtTime = (hhmmss?: string) => (hhmmss ? hhmmss.slice(0, 5) : "—");

/* =================== Página principal =================== */

export default function OvertimePage() {
  const { toast } = useToast();
  const qc = useQueryClient(); // 👈 SOLO UNA VEZ

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<number | "all">("all");
  const [selectedPlan, setSelectedPlan] = useState<TimePlanning | null>(null);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Estados de referencia
  const { data: refPlanStatusResp } = useQuery<ApiResponse<RefType[]>>({
    queryKey: ["ref-types", "PLAN_STATUS"],
    queryFn: () => TiposReferenciaAPI.byCategory("PLAN_STATUS"),
  });
  const planStatuses = refPlanStatusResp?.status === "success" ? (refPlanStatusResp.data || []) : [];

  // Planes
  const { data: plansResp, isLoading, refetch } = useQuery<ApiResponse<TimePlanning[]>>({
    queryKey: ["time-plannings"],
    queryFn: () => TimePlanningsAPI.list(),
  });
  const plans = plansResp?.status === "success" ? (plansResp.data || []) : [];

  // Empleados por plan (KPIs)
  const { data: employeesByPlan } = useQuery({
    queryKey: ["planning-employees-map", plans.map(p => p.planID).join(",")],
    queryFn: async () => {
      const map = new Map<number, PlanningEmployeeRow[]>();
      await Promise.all(
        plans.map(async (p) => {
          const r = await TimePlanningEmployeesAPI.getByPlan(p.planID);
          map.set(p.planID, r.status === "success" ? (r.data || []) : []);
        })
      );
      return map;
    },
    enabled: plans.length > 0,
  });

  // Cambiar estado del plan
  const updatePlanStatus = useMutation({
    mutationFn: async ({ id, planStatusTypeID }: { id: number; planStatusTypeID: number }) =>
      TimePlanningsAPI.update(id, { planStatusTypeID } as any),
    onSuccess: (resp) => {
      if (resp.status === "success") {
        toast({ title: "Estado actualizado", description: "La planificación fue actualizada." });
        qc.invalidateQueries({ queryKey: ["time-plannings"] });
      } else {
        toast({ title: "Error", description: resp.error.message, variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" }),
  });

  // Filtros
  const filtered = useMemo(() => {
    return plans
      .filter((p) => (statusFilter === "all" ? true : p.planStatusTypeID === statusFilter))
      .filter((p) =>
        search.trim()
          ? [p.title, p.description || "", p.planType, p.overtimeType || ""]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase())
          : true
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [plans, statusFilter, search]);

  const calcKpi = (planId: number) => {
    const rows = employeesByPlan?.get(planId) || [];
    const assigned = rows.reduce((acc, r) => acc + toMinutes(r.assignedHours, r.assignedMinutes), 0);
    const actual   = rows.reduce((acc, r) => acc + toMinutes(r.actualHours, r.actualMinutes), 0);
    const cost     = rows.reduce((acc, r) => acc + (r.paymentAmount || 0), 0);
    const pct = assigned > 0 ? Math.min(100, Math.round((actual / assigned) * 100)) : 0;
    return { assigned, actual, pct, cost };
  };

  const openEmployees = (plan: TimePlanning) => { setSelectedPlan(plan); setIsEmployeesOpen(true); };
  const closeEmployees = () => { setIsEmployeesOpen(false); setSelectedPlan(null); };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold">Consola de Planificación</h1>
          <p className="text-sm text-muted-foreground">
            Planifica <strong>Horas Extra</strong> o <strong>Recuperación</strong> y gestiona equipos desde una sola pantalla.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} className="h-10">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>
          <Button className="h-10" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva planificación
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Filtro</CardTitle>
          <CardDescription>Busca por título/descr./tipo y filtra por estado</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              className="h-10"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={String(statusFilter)}
              onValueChange={(val) => setStatusFilter(val === "all" ? "all" : Number(val))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                <SelectItem value="all"><Filter className="h-4 w-4 mr-2" /> Todos</SelectItem>
                {(planStatuses || []).map((s) => (
                  <SelectItem key={s.typeId} value={String(s.typeId)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vista móvil (cards) */}
      <div className="md:hidden space-y-3">
        {isLoading && (
          <Card>
            <CardContent className="py-6 flex items-center gap-2 text-sm">
              <RefreshCw className="animate-spin h-4 w-4" />
              Cargando…
            </CardContent>
          </Card>
        )}
        {!isLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground text-center">
              No hay planificaciones que coincidan con el filtro.
            </CardContent>
          </Card>
        )}
        {filtered.map((p) => {
          const kpi = calcKpi(p.planID);
          return (
            <Card key={p.planID} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{p.description || "—"}</CardDescription>
                  </div>
                  <StatusBadge statusId={p.planStatusTypeID} list={planStatuses} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="py-1">
                    {p.planType === "Recovery" ? <TimerReset className="h-3.5 w-3.5 mr-1" /> : <Clock className="h-3.5 w-3.5 mr-1" />}
                    {p.planType}
                  </Badge>
                  <Badge variant="secondary" className="py-1">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                  </Badge>
                  <Badge variant="outline" className="py-1">
                    {fmtTime(p.startTime)} – {fmtTime(p.endTime)}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="py-1">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Asig: {kpi.assigned}m
                  </Badge>
                  <Badge variant="secondary" className="py-1">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Real: {kpi.actual}m
                  </Badge>
                  <Badge variant={kpi.pct >= 100 ? "destructive" : "default"} className="py-1">
                    {kpi.pct}% cumpl.
                  </Badge>
                  <Badge variant="outline" className="py-1">
                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                    {fmtMoney(kpi.cost)}
                  </Badge>
                </div>

                {p.planType === "Overtime" ? (
                  <div className="text-xs text-muted-foreground">
                    Tipo: <strong>{p.overtimeType ?? "—"}</strong> · Factor: <strong>{p.factor ?? "—"}</strong>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Deuda (min): <strong>{p.owedMinutes ?? 0}</strong>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button onClick={() => openEmployees(p)} className="h-10 flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Empleados / Ejecución
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 px-3">
                        Estado <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {(planStatuses || []).map((st) => (
                        <DropdownMenuItem
                          key={st.typeId}
                          className="text-xs"
                          onClick={() => updatePlanStatus.mutate({ id: p.planID, planStatusTypeID: st.typeId })}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-2" />
                          {st.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Vista escritorio (tabla) */}
      <Card className="hidden md:block">
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Planificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="min-w-[260px]">KPI</TableHead>
                    <TableHead className="text-right min-w-[160px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const kpi = calcKpi(p.planID);
                    return (
                      <TableRow key={p.planID} className="align-top">
                        <TableCell>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{p.description || "—"}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            {p.planType === "Recovery" ? (
                              <TimerReset className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                            {p.planType}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.planType === "Overtime"
                              ? `Tipo: ${p.overtimeType ?? "—"} · Factor: ${p.factor ?? "—"}`
                              : `Deuda (min): ${p.owedMinutes ?? 0}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {fmtTime(p.startTime)} – {fmtTime(p.endTime)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge statusId={p.planStatusTypeID} list={planStatuses} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">
                              <Users className="h-3.5 w-3.5 mr-1" />
                              Asig: {kpi.assigned}m
                            </Badge>
                            <Badge variant="secondary">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Real: {kpi.actual}m
                            </Badge>
                            <Badge variant={kpi.pct >= 100 ? "destructive" : "default"}>
                              {kpi.pct}% cumpl.
                            </Badge>
                            <Badge variant="outline">
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              {fmtMoney(kpi.cost)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8">
                                  Opciones <ChevronDown className="h-4 w-4 ml-2" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => openEmployees(p)} className="text-sm">
                                  <Eye className="h-4 w-4 mr-2" /> Empleados / Ejecución
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Cambiar estado</div>
                                </DropdownMenuItem>
                                {(planStatuses || []).map((st) => (
                                  <DropdownMenuItem
                                    key={st.typeId}
                                    className="text-xs"
                                    onClick={() => updatePlanStatus.mutate({ id: p.planID, planStatusTypeID: st.typeId })}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 mr-2" />
                                    {st.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {!isLoading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No hay planificaciones que coincidan con el filtro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de empleados */}
      {selectedPlan && (
        <Dialog open={isEmployeesOpen} onOpenChange={setIsEmployeesOpen}>
          <DialogContent className="w-[95vw] max-w-[1100px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestión de empleados — {selectedPlan.title}</DialogTitle>
              <DialogDescription>Asigna empleados, actualiza estados y registra ejecución.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4">
              <TimePlanningEmployeeForm
                planningId={selectedPlan.planID}
                planningTitle={selectedPlan.title}
                isOpen={true}
                onClose={() => {}}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button className="h-10" onClick={() => setIsEmployeesOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo crear */}
      <CreatePlanningDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        planStatuses={planStatuses}
      />
    </div>
  );
}

/* ---------------- Badge por estado ---------------- */

function StatusBadge({ statusId, list }: { statusId: number; list: RefType[] }) {
  const s = list?.find((x) => x.typeId === statusId);
  const map: Record<string, "default" | "secondary" | "destructive" | "outline" | "success"> = {
    "Borrador": "secondary",
    "En Progreso": "default",
    "Planificado": "outline",
    "Aprobado": "success",
    "Completado": "success",
    "Rechazado": "destructive",
    "Cancelado": "destructive",
  };
  if (!s) return <Badge variant="outline">Desconocido</Badge>;
  return <Badge variant={map[s.name] || "outline"}>{s.name}</Badge>;
}

/* =========================================================
 * Diálogo centrado: Crear planificación (ACTUALIZADO)
 * =======================================================*/

// Obtiene el employeeId del usuario (ajusta a tu contexto)
function getCreatedBy(): number {
  try {
    // @ts-ignore
    const fromCtx = window?.CURRENT_EMPLOYEE_ID;
    if (typeof fromCtx === "number" && fromCtx > 0) return fromCtx;

    const ls = Number(localStorage.getItem("employeeId") || localStorage.getItem("userEmployeeId"));
    if (!isNaN(ls) && ls > 0) return ls;

    // @ts-ignore
    const fromToken = Number((window?.tokenProfile?.employeeId) ?? 0);
    if (!isNaN(fromToken) && fromToken > 0) return fromToken;
  } catch {}
  return 1; // fallback, cámbialo por un ID válido en tu entorno
}

// Normaliza valores al formato que espera el backend
function toApiPlanType(uiValue: "OVERTIME" | "RECOVERY"): "Overtime" | "Recovery" {
  return uiValue === "OVERTIME" ? "Overtime" : "Recovery";
}
function toApiOvertimeType(uiValue: string): "Ordinary" | "Night" | "Holiday" {
  const v = (uiValue || "").toUpperCase();
  if (v === "NOCTURNO" || v === "NIGHT") return "Night";
  if (v === "FERIADO" || v === "HOLIDAY") return "Holiday";
  return "Ordinary";
}

function CreatePlanningDialog({
  open,
  onOpenChange,
  planStatuses
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planStatuses: { typeId: number; name: string }[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---------- helpers fecha/hora ----------
  const ensureTime = (val: string) => (val?.length === 5 ? `${val}:00` : val);
  const parseHM = (t: string) => {
    const [h, m] = (t || "00:00").slice(0,5).split(":").map(Number);
    return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
  };
  const minutesOfDay = (t: string) => {
    const { h, m } = parseHM(t);
    return h * 60 + m;
  };
  const tomorrowLocalISO = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0,10);
  };
  const MIN_START_DATE = tomorrowLocalISO();

  const buildSlots = (fromHHMM: string, toHHMM: string, stepMin = 30) => {
    const out: string[] = [];
    let cur = minutesOfDay(fromHHMM);
    const end = minutesOfDay(toHHMM);
    while (cur <= end) {
      const h = Math.floor(cur/60).toString().padStart(2,"0");
      const m = (cur%60).toString().padStart(2,"0");
      out.push(`${h}:${m}`);
      cur += stepMin;
    }
    return out;
  };

  // ---------- parámetros/jornadas y configs ----------
  const { data: nightStartResp } = useQuery({
    queryKey: ["param-NIGHT_START"],
    queryFn: () => DirectoryParametersAPI.getByCode("NIGHT_START"),
  });
  const { data: nightEndResp } = useQuery({
    queryKey: ["param-NIGHT_END"],
    queryFn: () => DirectoryParametersAPI.getByCode("NIGHT_END"),
  });
  const nightStart = (nightStartResp as any)?.status === "success" ? ((nightStartResp as any).data?.pvalue || "").trim() : "22:00";
  const nightEnd   = (nightEndResp as any)?.status === "success" ? ((nightEndResp as any).data?.pvalue || "").trim() : "06:00";

  const { data: cfgResp } = useQuery({
    queryKey: ["overtime-config"],
    queryFn: () => ConfigHorasExtrasAPI.list(),
  });
  const overtimeConfigs: any[] = (cfgResp as any)?.status === "success" ? ((cfgResp as any).data || []) : [];
  const factorMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of overtimeConfigs) {
      const key = String(c.name || c.overtimeType || "").replace(/\s+/g, "").toUpperCase();
      if (c?.factor != null) map.set(key, Number(c.factor));
    }
    return map;
  }, [overtimeConfigs]);

  // ---------- estado UI ----------
  const [planTypeUI, setPlanTypeUI] = useState<"OVERTIME" | "RECOVERY">("OVERTIME");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const initialTimes = {
    OVERTIME: { start: "18:00", end: "22:00" },
    RECOVERY: { start: "08:00", end: "09:00" },
  };

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState(initialTimes.OVERTIME.start);
  const [endTime, setEndTime] = useState(initialTimes.OVERTIME.end);
  const [overtimeType, setOvertimeType] = useState<string>("");
  const [factor, setFactor] = useState<number | null>(null);
  const [owedMinutes, setOwedMinutes] = useState<number>(0);
  const [requiresApproval, setRequiresApproval] = useState(true);

  // Estado "Borrador"
  const borradorTypeId = useMemo(() => {
    const b = planStatuses?.find(s => s.name?.toLowerCase() === "borrador");
    return b?.typeId ?? null;
  }, [planStatuses]);

  // ---------- slots (ambos tipos ahora 00:00–23:30) ----------
  const FULL_START = "00:00";
  const FULL_END   = "23:30";
  const timeSlots = useMemo(() => buildSlots(FULL_START, FULL_END, 30), []);

  // ---------- utilidades ----------
  const hasWeekendInRange = (d1: string, d2: string) => {
    if (!d1 || !d2) return false;
    const start = new Date(d1 + "T00:00:00");
    const end   = new Date(d2 + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay(); // 0=Dom, 6=Sáb
      if (dow === 0 || dow === 6) return true;
    }
    return false;
  };

  const overlapsNight = (from: string, to: string, nStart: string, nEnd: string) => {
    if (!from || !to || !nStart || !nEnd) return false;
    const a1 = minutesOfDay(from);
    const a2 = minutesOfDay(to);
    const A1 = a1, A2 = a2 <= a1 ? a2 + 24 * 60 : a2; // permite cruzar medianoche
    const n1 = minutesOfDay(nStart);
    const n2Raw = minutesOfDay(nEnd);
    const N1 = n1;
    const N2 = n2Raw <= n1 ? n2Raw + 24 * 60 : n2Raw;
    const intersects = (x1: number, x2: number, y1: number, y2: number) => Math.max(x1, y1) < Math.min(x2, y2);
    return intersects(A1, A2, N1, N2) ||
           intersects(A1 + 24*60, A2 + 24*60, N1, N2) ||
           intersects(A1, A2, N1 + 24*60, N2 + 24*60);
  };

  const classifyOvertimeType = (from: string, to: string, startD: string, endD: string) => {
    const night = overlapsNight(from, to, nightStart, nightEnd);
    const weekend = hasWeekendInRange(startD, endD);
    if (weekend) return "FERIADO";
    if (night) return "NOCTURNO";
    // Ventana ordinaria 17:00–22:00
    const ORD_START = 17 * 60, ORD_END = 22 * 60;
    const a1 = minutesOfDay(from), a2 = minutesOfDay(to);
    const A1 = a1, A2 = a2 <= a1 ? a2 + 24 * 60 : a2;
    const intersects = (x1: number, x2: number, y1: number, y2: number) => Math.max(x1, y1) < Math.min(x2, y2);
    const ordOverlap = intersects(A1, A2, ORD_START, ORD_END);
    if (ordOverlap) return "ORDINARIO";
    return "ORDINARIO";
  };

  // ---------- reset al abrir + reset por tipo ----------
  const resetForm = (type: "OVERTIME" | "RECOVERY") => {
    setPlanTypeUI(type);
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStartTime(initialTimes[type].start);
    setEndTime(initialTimes[type].end);
    setOvertimeType(type === "OVERTIME" ? "" : "");
    setFactor(null);
    setOwedMinutes(0);
    setRequiresApproval(true);
  };

  useEffect(() => {
    if (open) {
      // Siempre abrir con HE por defecto y valores limpios
      resetForm("OVERTIME");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cuando el usuario cambia entre HE/Recuperación con los botones
  const handleSwitchPlanType = (type: "OVERTIME" | "RECOVERY") => {
    resetForm(type);
  };

  // ---------- recálculo dinámico ----------
  useEffect(() => {
    if (planTypeUI === "RECOVERY") {
      const s = minutesOfDay(startTime);
      const e = minutesOfDay(endTime);
      const diff = e > s ? (e - s) : 0;
      setOwedMinutes(diff);
      setOvertimeType("");
      setFactor(null);
      return;
    }

    // HE
    const heType = classifyOvertimeType(startTime, endTime, startDate, endDate);
    setOvertimeType(heType);

    const night = overlapsNight(startTime, endTime, nightStart, nightEnd);
    // ‘Feriado nocturno’: factor especial si existe
    if (heType === "FERIADO" && night && factorMap.has("FERIADONOCTURNO")) {
      setFactor(factorMap.get("FERIADONOCTURNO") ?? null);
    } else {
      setFactor(factorMap.get(heType.replace(/\s+/g, "").toUpperCase()) ?? null);
    }
  }, [planTypeUI, startTime, endTime, startDate, endDate, factorMap, nightStart, nightEnd]);

  // ---------- validaciones ----------
  const validateBusinessRules = () => {
    if (!startDate || !endDate) throw new Error("Completa el rango de fechas");
    if (startDate < MIN_START_DATE) throw new Error("La planificación solo puede iniciar a partir de mañana");
    if (endDate < startDate) throw new Error("La fecha fin no puede ser anterior a la fecha inicio");
    if (!startTime || !endTime) throw new Error("Define la hora de inicio y fin");

    const s = minutesOfDay(startTime);
    const e = minutesOfDay(endTime);
    if (e <= s) throw new Error("La hora fin debe ser mayor a la hora inicio");

    if (planTypeUI === "OVERTIME") {
      if (!overtimeType) throw new Error("No se pudo determinar el tipo de horas extra");
      if (factor == null) throw new Error("No se encontró un factor en la configuración para el tipo determinado");
    } else {
      if (!owedMinutes || owedMinutes <= 0) throw new Error("El rango de recuperación debe ser mayor a 0 minutos");
    }
  };

  // ---------- creación ----------
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!borradorTypeId) throw new Error("No se encontró el estado 'Borrador' en PLAN_STATUS");
      validateBusinessRules();

      const payload: any = {
        planType: toApiPlanType(planTypeUI),       // "Overtime" | "Recovery"
        title: title.trim(),
        description: description?.trim() || undefined,
        startDate,
        endDate,
        startTime: ensureTime(startTime),
        endTime: ensureTime(endTime),
        planStatusTypeID: borradorTypeId,
        requiresApproval,
        createdBy: getCreatedBy(),
      };

      if (planTypeUI === "OVERTIME") {
        payload.overtimeType = toApiOvertimeType(overtimeType);  // "Ordinary" | "Night" | "Holiday"
        payload.factor = factor;
      } else {
        payload.owedMinutes = owedMinutes;
      }

      Object.keys(payload).forEach(k => {
        if (payload[k] === null) delete payload[k];
        if (payload[k] === "") delete payload[k];
      });

      return await TimePlanningsAPI.create(payload);
    },
    onSuccess: (resp) => {
      if (resp.status === "success") {
        toast({ title: "Planificación creada (Borrador)" });
        queryClient.invalidateQueries({ queryKey: ["time-plannings"] });
        onOpenChange(false);
      } else {
        const d: any = resp.error?.details;
        let msg = resp.error.message;
        if (d?.errors) {
          const flat = Object.entries(d.errors)
            .map(([k, v]: any) => `${k}: ${(v || []).join(", ")}`)
            .join(" · ");
          if (flat) msg += ` — ${flat}`;
        } else if (d?.message) {
          msg += ` — ${d.message}`;
        }
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "No se pudo crear", variant: "destructive" });
    },
  });

  /* ========= UI centrada y responsiva ========= */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle>Nueva planificación</DialogTitle>
          <DialogDescription>
            El estado se crea como <b>Borrador</b>. Fechas válidas desde mañana.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-w-2xl mx-auto space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={planTypeUI === "OVERTIME" ? "default" : "outline"}
              onClick={() => handleSwitchPlanType("OVERTIME")}
              className="h-10"
            >
              <Clock className="h-4 w-4 mr-2" /> HE
            </Button>
            <Button
              type="button"
              variant={planTypeUI === "RECOVERY" ? "default" : "outline"}
              onClick={() => handleSwitchPlanType("RECOVERY")}
              className="h-10"
            >
              <TimerReset className="h-4 w-4 mr-2" /> Recuperación
            </Button>
          </div>

          {/* Título / Descripción */}
          <div className="space-y-2">
            <Label>Título</Label>
            <Input className="h-10" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. HE Jornada Nocturna" />
            <Label className="mt-2">Descripción (opcional)</Label>
            <Input className="h-10" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles" />
          </div>

          {/* Rango fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Desde</Label>
              <Input className="h-10" type="date" min={MIN_START_DATE} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input className="h-10" type="date" min={startDate || MIN_START_DATE} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Horas (ambos tipos = 00:00–23:30) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Hora inicio</Label>
              <Select value={startTime} onValueChange={(v) => setStartTime(v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {timeSlots.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hora fin</Label>
              <Select value={endTime} onValueChange={(v) => setEndTime(v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {timeSlots.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dinámico HE / Recuperación */}
          {planTypeUI === "OVERTIME" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de HE (automático)</Label>
                <Input className="h-10" value={overtimeType || ""} readOnly placeholder="Calculando…" />
              </div>
              <div className="space-y-2">
                <Label>Factor (configuración)</Label>
                <Input className="h-10" value={factor ?? ""} readOnly placeholder="Auto" />
              </div>
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                Reglas: 17:00–22:00 <b>Ordinario</b>, 22:00–06:00 <b>Nocturno</b>, fin de semana <b>Feriado</b>.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Minutos a recuperar</Label>
                <Input className="h-10" value={String(owedMinutes)} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input className="h-10" readOnly value="Borrador" />
              </div>
            </div>
          )}

          {/* Aprobación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Estado</Label>
              <Input className="h-10" readOnly value="Borrador" />
              {!borradorTypeId && (
                <p className="text-xs text-destructive">No se encontró el tipo "Borrador" en PLAN_STATUS</p>
              )}
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} id="requiresApproval" />
              <Label htmlFor="requiresApproval">Requiere aprobación</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 max-w-2xl mx-auto">
          <Button className="w-full sm:w-auto h-10" onClick={() => createMutation.mutate()}>
            Crear (Borrador)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
