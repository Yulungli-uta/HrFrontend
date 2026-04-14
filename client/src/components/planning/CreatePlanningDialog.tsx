// src/components/planning/CreatePlanningDialog.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import {
  TimePlanningsAPI,
  ConfigHorasExtrasAPI,
  ParametersAPI,
  VistaDetallesEmpleadosAPI,
  TiposReferenciaAPI,
} from "@/lib/api";
import { useAuth } from "@/features/auth";
import { parseApiError } from "@/lib/error-handling";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  Clock,
  Loader2,
  PlusCircle,
  TimerReset,
  Trash2,
  Users,
} from "lucide-react";

type RefStatus = {
  typeId: number;
  name: string;
};

type PlanTypeUI = "OVERTIME" | "RECOVERY";

type SelectedEmployee = {
  employeeID: number;
  fullName: string;
  detail?: string;
  extra?: string;
  assignedHours?: number;
  assignedMinutes?: number;
};

type CandidateEmployee = {
  employeeID: number;
  fullName: string;
  detail?: string;
  extra?: string;
};

type BossSubordinateRow = {
  employeeID?: number;
  employeeId?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  idCard?: string;
  email?: string;
  department?: string;
};

function toApiPlanType(uiValue: PlanTypeUI): "Overtime" | "Recovery" {
  return uiValue === "OVERTIME" ? "Overtime" : "Recovery";
}

function normalizeHeKey(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}

function toApiOvertimeType(uiValue: string): string {
  const v = normalizeHeKey(uiValue);

  if (v.includes("NOCT") || v === "NOCTURNA" || v === "NIGHT") return "Nocturna";
  if (v.includes("FERI") || v === "FERIADA" || v === "HOLIDAY") return "Feriado";
  return "Ordinaria";
}

function buildFactorMap(configs: any[]) {
  const map = new Map<string, number>();

  for (const c of configs) {
    const candidates = [c?.name, c?.overtimeType, c?.type, c?.description]
      .filter(Boolean)
      .map((x: any) => normalizeHeKey(String(x)));

    const factor = Number(c?.factor);
    if (!Number.isFinite(factor) || factor <= 0) continue;

    for (const key of candidates) {
      if (key) map.set(key, factor);
    }
  }

  return map;
}

function findFactorForHeType(
  heType: string,
  factorMap: Map<string, number>,
  night: boolean
) {
  const normalized = normalizeHeKey(heType);

  const candidates: string[] =
    (normalized === "FERIADO" || normalized === "FERIADA") && night
      ? ["FERIADONOCTURNO", "FERIADONOCTURNA", "HOLIDAYNIGHT", "FERIADO", "FERIADA", "HOLIDAY"]
      : normalized === "NOCTURNO" || normalized === "NOCTURNA"
      ? ["NOCTURNO", "NOCTURNA", "NIGHT"]
      : normalized === "ORDINARIO" || normalized === "ORDINARIA"
      ? ["ORDINARIO", "ORDINARIA", "ORDINARY"]
      : normalized === "FERIADO" || normalized === "FERIADA"
      ? ["FERIADO", "FERIADA", "HOLIDAY"]
      : [normalized];

  for (const key of candidates) {
    const factor = factorMap.get(key);
    if (factor != null && factor > 0) return factor;
  }

  return null;
}

export default function CreatePlanningDialog({
  open,
  onOpenChange,
  planStatuses,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planStatuses: RefStatus[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { employeeDetails } = useAuth();
  const bossId = employeeDetails?.employeeID ?? 0;

  const [planTypeUI, setPlanTypeUI] = useState<PlanTypeUI>("OVERTIME");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("22:00");
  const [overtimeType, setOvertimeType] = useState("");
  const [factor, setFactor] = useState<number | null>(null);
  const [owedMinutes, setOwedMinutes] = useState<number>(0);
  const [requiresApproval, setRequiresApproval] = useState(true);

  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<SelectedEmployee[]>([]);
  const [candidateEmployee, setCandidateEmployee] = useState<CandidateEmployee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const ensureTime = (val: string) => (val?.length === 5 ? `${val}:00` : val);

  const dateInputClass =
    "h-10 [color-scheme:light] dark:[color-scheme:dark] dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-100";

  const parseHM = (t: string) => {
    const [h, m] = (t || "00:00").slice(0, 5).split(":").map(Number);
    return { h: Number.isNaN(h) ? 0 : h, m: Number.isNaN(m) ? 0 : m };
  };

  const minutesOfDay = (t: string) => {
    const { h, m } = parseHM(t);
    return h * 60 + m;
  };

  const toLocalISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const tomorrowLocalISO = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return toLocalISODate(d);
  };

  const MIN_START_DATE = tomorrowLocalISO();

  const buildSlots = (fromHHMM: string, toHHMM: string, stepMin = 30) => {
    const out: string[] = [];
    let cur = minutesOfDay(fromHHMM);
    const end = minutesOfDay(toHHMM);

    while (cur <= end) {
      const h = Math.floor(cur / 60).toString().padStart(2, "0");
      const m = (cur % 60).toString().padStart(2, "0");
      out.push(`${h}:${m}`);
      cur += stepMin;
    }

    return out;
  };

  const timeSlots = useMemo(() => buildSlots("00:00", "23:30", 30), []);

  const durationMinutes = useMemo(() => {
    const s = minutesOfDay(startTime);
    const e = minutesOfDay(endTime);
    return e > s ? e - s : 0;
  }, [startTime, endTime]);

  const durationHours = useMemo(
    () => Number((durationMinutes / 60).toFixed(2)),
    [durationMinutes]
  );

  const borradorTypeId = useMemo(() => {
    const item = planStatuses.find((s) => s.name?.toLowerCase() === "borrador");
    return item?.typeId ?? null;
  }, [planStatuses]);

  const isPlanStatusesReady = borradorTypeId !== null;

  const { data: employeePlanStatusResp } = useQuery({
    queryKey: ["ref-types", "EMPLOYEE_PLAN_STATUS"],
    queryFn: () => TiposReferenciaAPI.byCategory("EMPLOYEE_PLAN_STATUS"),
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const employeePlanStatuses: RefStatus[] =
    employeePlanStatusResp?.status === "success"
      ? employeePlanStatusResp.data || []
      : [];

  const asignadoTypeId = useMemo(() => {
    const item = employeePlanStatuses.find(
      (s) => s.name?.toLowerCase() === "asignado"
    );
    return item?.typeId ?? null;
  }, [employeePlanStatuses]);

  const isEmployeeStatusesReady = asignadoTypeId !== null;

  const NIGHT_START_DEFAULT = "22:00";
  const NIGHT_END_DEFAULT = "06:00";

  const { data: nightStartResp } = useQuery({
    queryKey: ["param-NIGHT_START"],
    queryFn: () => ParametersAPI.getByName("NIGHT_START"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: nightEndResp } = useQuery({
    queryKey: ["param-NIGHT_END"],
    queryFn: () => ParametersAPI.getByName("NIGHT_END"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const nightStart =
    (nightStartResp as any)?.status === "success" &&
    (nightStartResp as any).data?.pvalue?.trim()
      ? (nightStartResp as any).data.pvalue.trim()
      : NIGHT_START_DEFAULT;

  const nightEnd =
    (nightEndResp as any)?.status === "success" &&
    (nightEndResp as any).data?.pvalue?.trim()
      ? (nightEndResp as any).data.pvalue.trim()
      : NIGHT_END_DEFAULT;

  const { data: cfgResp } = useQuery({
    queryKey: ["overtime-config"],
    queryFn: () => ConfigHorasExtrasAPI.list(),
    staleTime: 5 * 60_000,
  });

  const overtimeConfigs: any[] =
    (cfgResp as any)?.status === "success" ? (cfgResp as any).data || [] : [];

  const factorMap = useMemo(() => buildFactorMap(overtimeConfigs), [overtimeConfigs]);

  const hasWeekendInRange = (d1: string, d2: string) => {
    if (!d1 || !d2) return false;

    const start = new Date(`${d1}T00:00:00`);
    const end = new Date(`${d2}T00:00:00`);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) return true;
    }

    return false;
  };

  const overlapsNight = (from: string, to: string, nStart: string, nEnd: string) => {
    if (!from || !to || !nStart || !nEnd) return false;

    const a1 = minutesOfDay(from);
    const a2 = minutesOfDay(to);
    const A1 = a1;
    const A2 = a2 <= a1 ? a2 + 24 * 60 : a2;

    const n1 = minutesOfDay(nStart);
    const n2Raw = minutesOfDay(nEnd);
    const N1 = n1;
    const N2 = n2Raw <= n1 ? n2Raw + 24 * 60 : n2Raw;

    const intersects = (x1: number, x2: number, y1: number, y2: number) =>
      Math.max(x1, y1) < Math.min(x2, y2);

    return (
      intersects(A1, A2, N1, N2) ||
      intersects(A1 + 24 * 60, A2 + 24 * 60, N1, N2) ||
      intersects(A1, A2, N1 + 24 * 60, N2 + 24 * 60)
    );
  };

  const classifyOvertimeType = (
    from: string,
    to: string,
    startD: string,
    endD: string
  ) => {
    const night = overlapsNight(from, to, nightStart, nightEnd);
    const weekend = hasWeekendInRange(startD, endD);

    if (weekend) return "FERIADO";
    if (night) return "NOCTURNO";
    return "ORDINARIO";
  };

  useEffect(() => {
    if (planTypeUI === "RECOVERY") {
      setOwedMinutes(durationMinutes);
      setOvertimeType("");
      setFactor(null);
      return;
    }

    const heType = classifyOvertimeType(startTime, endTime, startDate, endDate);
    setOvertimeType(heType);

    const night = overlapsNight(startTime, endTime, nightStart, nightEnd);
    const resolvedFactor = findFactorForHeType(heType, factorMap, night);
    setFactor(resolvedFactor);
  }, [
    planTypeUI,
    startTime,
    endTime,
    startDate,
    endDate,
    nightStart,
    nightEnd,
    factorMap,
    durationMinutes,
  ]);

  const resetForm = () => {
    setPlanTypeUI("OVERTIME");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStartTime("18:00");
    setEndTime("22:00");
    setOvertimeType("");
    setFactor(null);
    setOwedMinutes(0);
    setRequiresApproval(true);
    setSelectedEmployees([]);
    setCandidateEmployee(null);
    setEmployeeSearch("");
    setEmployeeSearchOpen(false);
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const { data: bossSubordinatesResp, isLoading: isLoadingBossSubordinates } = useQuery({
    queryKey: ["boss-subordinates", bossId],
    queryFn: () => VistaDetallesEmpleadosAPI.byImmediateBoss(bossId),
    enabled: open && bossId > 0,
    staleTime: 30_000,
  });

  const bossSubordinates: BossSubordinateRow[] =
    bossSubordinatesResp?.status === "success"
      ? bossSubordinatesResp.data || []
      : [];

  const selectedIds = useMemo(
    () => new Set(selectedEmployees.map((x) => x.employeeID)),
    [selectedEmployees]
  );

  const availableEmployeeOptions = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();

    return bossSubordinates
      .map((e) => {
        const employeeID = Number(e.employeeID ?? e.employeeId ?? 0);
        const fullName =
          String(
            e.fullName ?? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim()
          ).trim() || `Empleado #${employeeID}`;

        return {
          employeeID,
          fullName,
          detail: e.idCard ?? undefined,
          extra: e.department ?? e.email ?? undefined,
        };
      })
      .filter((e) => e.employeeID > 0)
      .filter((e) => !selectedIds.has(e.employeeID))
      .filter((e) => {
        if (!q) return true;
        return [e.fullName, e.detail || "", e.extra || ""]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [bossSubordinates, employeeSearch, selectedIds]);

  const handlePickCandidate = (opt: CandidateEmployee) => {
    if (!opt.employeeID || selectedIds.has(opt.employeeID)) return;

    setCandidateEmployee({
      employeeID: opt.employeeID,
      fullName: opt.fullName,
      detail: opt.detail,
      extra: opt.extra,
    });

    setEmployeeSearchOpen(false);
  };

  const addCandidateEmployee = () => {
    if (!candidateEmployee || selectedIds.has(candidateEmployee.employeeID)) return;

    setSelectedEmployees((prev) => [
      ...prev,
      {
        employeeID: candidateEmployee.employeeID,
        fullName: candidateEmployee.fullName,
        detail: candidateEmployee.detail,
        extra: candidateEmployee.extra,
        assignedHours: planTypeUI === "OVERTIME" ? durationHours : undefined,
        assignedMinutes: planTypeUI === "RECOVERY" ? durationMinutes : undefined,
      },
    ]);

    setCandidateEmployee(null);
    setEmployeeSearch("");
  };

  const removeEmployee = (employeeID: number) => {
    setSelectedEmployees((prev) => prev.filter((x) => x.employeeID !== employeeID));
  };

  const updateEmployeeHours = (employeeID: number, value: string) => {
    const num = Number(value);
    setSelectedEmployees((prev) =>
      prev.map((x) =>
        x.employeeID === employeeID
          ? { ...x, assignedHours: Number.isNaN(num) ? 0 : num }
          : x
      )
    );
  };

  const updateEmployeeMinutes = (employeeID: number, value: string) => {
    const num = Number(value);
    setSelectedEmployees((prev) =>
      prev.map((x) =>
        x.employeeID === employeeID
          ? { ...x, assignedMinutes: Number.isNaN(num) ? 0 : num }
          : x
      )
    );
  };

  const validateBusinessRules = () => {
    if (!title.trim()) throw new Error("El título es obligatorio");
    if (!startDate || !endDate) throw new Error("Completa el rango de fechas");
    if (startDate < MIN_START_DATE) {
      throw new Error("La planificación solo puede iniciar a partir de mañana");
    }
    if (endDate < startDate) {
      throw new Error("La fecha fin no puede ser menor a la fecha inicio");
    }
    if (!startTime || !endTime) {
      throw new Error("Define la hora de inicio y fin");
    }
    if (durationMinutes <= 0) {
      throw new Error("La hora fin debe ser mayor a la hora inicio");
    }
    if (!isPlanStatusesReady) {
      throw new Error("Los estados de planificación aún están cargando.");
    }
    if (!isEmployeeStatusesReady) {
      throw new Error("Los estados de empleado aún están cargando.");
    }
    if (selectedEmployees.length === 0) {
      throw new Error("Debes agregar al menos un empleado");
    }

    if (planTypeUI === "OVERTIME") {
      if (!overtimeType) throw new Error("No se pudo determinar el tipo de horas extra");
      if (factor == null || factor <= 0) {
        throw new Error(
          `No se encontró un factor válido para el tipo "${overtimeType}".`
        );
      }

      for (const emp of selectedEmployees) {
        if (!emp.assignedHours || emp.assignedHours <= 0) {
          throw new Error(`Horas asignadas inválidas para ${emp.fullName}`);
        }
      }
    }

    if (planTypeUI === "RECOVERY") {
      if (!owedMinutes || owedMinutes <= 0) {
        throw new Error("El rango de recuperación debe ser mayor a 0 minutos");
      }

      for (const emp of selectedEmployees) {
        if (!emp.assignedMinutes || emp.assignedMinutes <= 0) {
          throw new Error(`Minutos asignados inválidos para ${emp.fullName}`);
        }
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      validateBusinessRules();

      const payload = {
        planType: toApiPlanType(planTypeUI),
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        startTime: ensureTime(startTime),
        endTime: ensureTime(endTime),
        planStatusTypeID: borradorTypeId!,
        createdBy: bossId,
        requiresApproval,
        employees: selectedEmployees.map((emp) => ({
          planID: 0,
          employeeID: emp.employeeID,
          employeeStatusTypeID: asignadoTypeId!,
          assignedHours: planTypeUI === "OVERTIME" ? emp.assignedHours : undefined,
          assignedMinutes: planTypeUI === "RECOVERY" ? emp.assignedMinutes : undefined,
          actualHours: 0,
          actualMinutes: 0,
        })),
        ...(planTypeUI === "OVERTIME"
          ? {
              overtimeType: toApiOvertimeType(overtimeType),
              factor: factor!,
            }
          : {
              owedMinutes,
            }),
      };

      return TimePlanningsAPI.create(payload as any);
    },
    onSuccess: (resp) => {
      if (resp.status === "success") {
        toast({
          title: "Planificación creada",
          description: "Se creó correctamente con sus empleados.",
        });
        queryClient.invalidateQueries({ queryKey: ["time-plannings"] });
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: resp.error.message,
          variant: "destructive",
        });
      }
    },
    onError: (e: unknown) => {
      toast({
        title: "Error",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !createMutation.isPending && onOpenChange(v)}
    >
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] overflow-hidden p-0">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Nueva planificación</DialogTitle>
            <DialogDescription>
              Se crea en estado <strong>Borrador</strong> junto con los empleados
              asignados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={planTypeUI === "OVERTIME" ? "default" : "outline"}
                  onClick={() => setPlanTypeUI("OVERTIME")}
                  disabled={createMutation.isPending}
                  className="h-10"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  HE
                </Button>

                <Button
                  type="button"
                  variant={planTypeUI === "RECOVERY" ? "default" : "outline"}
                  onClick={() => setPlanTypeUI("RECOVERY")}
                  disabled={createMutation.isPending}
                  className="h-10"
                >
                  <TimerReset className="h-4 w-4 mr-2" />
                  Recuperación
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={createMutation.isPending}
                    placeholder="Ej. HE Jornada Nocturna"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={createMutation.isPending}
                    placeholder="Detalles"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    min={MIN_START_DATE}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={createMutation.isPending}
                    className={dateInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    min={startDate || MIN_START_DATE}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={createMutation.isPending}
                    className={dateInputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Hora inicio</Label>
                  <Select
                    value={startTime}
                    onValueChange={setStartTime}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[50vh]">
                      {timeSlots.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hora fin</Label>
                  <Select
                    value={endTime}
                    onValueChange={setEndTime}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[50vh]">
                      {timeSlots.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {planTypeUI === "OVERTIME" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo de HE</Label>
                    <Input readOnly value={overtimeType || ""} />
                  </div>

                  <div className="space-y-2">
                    <Label>Factor</Label>
                    <Input readOnly value={factor ?? ""} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Minutos a recuperar</Label>
                  <Input readOnly value={String(owedMinutes)} />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={requiresApproval}
                  onCheckedChange={setRequiresApproval}
                  id="requiresApproval"
                  disabled={createMutation.isPending}
                />
                <Label htmlFor="requiresApproval">Requiere aprobación</Label>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <Label>Empleados</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Solo se muestran subordinados del jefe inmediato logueado.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-2 items-start">
                  <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                        disabled={createMutation.isPending}
                      >
                        <span className="truncate">
                          {candidateEmployee
                            ? `${candidateEmployee.fullName}${
                                candidateEmployee.detail
                                  ? ` — ${candidateEmployee.detail}`
                                  : ""
                              }`
                            : "Buscar subordinado..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      className="w-[min(420px,calc(100vw-3rem))] p-0"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar por nombre, cédula o correo..."
                          value={employeeSearch}
                          onValueChange={setEmployeeSearch}
                        />

                        <CommandList>
                          {isLoadingBossSubordinates ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Buscando...
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>No se encontraron subordinados.</CommandEmpty>

                              <CommandGroup>
                                {availableEmployeeOptions.map((opt) => (
                                  <CommandItem
                                    key={String(opt.employeeID)}
                                    value={String(opt.employeeID)}
                                    onSelect={() => handlePickCandidate(opt)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        candidateEmployee?.employeeID === opt.employeeID
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate">{opt.fullName}</span>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {opt.detail || "Sin detalle"}
                                        {opt.extra ? ` · ${opt.extra}` : ""}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button
                    type="button"
                    onClick={addCandidateEmployee}
                    disabled={!candidateEmployee || createMutation.isPending}
                    className="w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Agregar empleado
                  </Button>
                </div>

                <div className="border rounded-md">
                  <div className="max-h-52 sm:max-h-56 md:max-h-64 overflow-y-auto p-3 space-y-2">
                    {selectedEmployees.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No has agregado empleados.
                      </div>
                    ) : (
                      selectedEmployees.map((emp) => (
                        <div
                          key={emp.employeeID}
                          className="border rounded-md p-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px_120px] gap-3 items-end"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{emp.fullName}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {emp.detail || `ID ${emp.employeeID}`}
                              {emp.extra ? ` · ${emp.extra}` : ""}
                            </div>
                          </div>

                          {planTypeUI === "OVERTIME" ? (
                            <div className="space-y-2">
                              <Label>Horas asignadas</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.25"
                                value={emp.assignedHours ?? 0}
                                onChange={(e) =>
                                  updateEmployeeHours(emp.employeeID, e.target.value)
                                }
                                disabled={createMutation.isPending}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label>Minutos asignados</Label>
                              <Input
                                type="number"
                                min="0"
                                value={emp.assignedMinutes ?? 0}
                                onChange={(e) =>
                                  updateEmployeeMinutes(emp.employeeID, e.target.value)
                                }
                                disabled={createMutation.isPending}
                              />
                            </div>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeEmployee(emp.employeeID)}
                            disabled={createMutation.isPending}
                            className="w-full"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Quitar
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    Total empleados: {selectedEmployees.length}
                  </Badge>
                  {planTypeUI === "OVERTIME" ? (
                    <Badge variant="secondary">
                      Duración sugerida: {durationHours}h
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Duración sugerida: {durationMinutes} min
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>

            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !isPlanStatusesReady || !isEmployeeStatusesReady}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : !isPlanStatusesReady || !isEmployeeStatusesReady ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cargando catálogos...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Crear con empleados
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}