import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FilePlus2,
  Filter,
  Search,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { usePaged } from "@/hooks/pagination/usePaged";
import { useAuth } from "@/features/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DataPagination } from "@/components/ui/DataPagination";

import {
  ScheduleChangePlansAPI,
  HorariosAPI,
  VistaDetallesEmpleadosAPI,
  TiposReferenciaAPI,
} from "@/lib/api";

import { ActiveSchedulePicker } from "@/components/schedules/ActiveSchedulePicker";
import { SubordinateEmployeePicker } from "@/components/employees/SubordinateEmployeePicker";
import { ScheduleChangePlanDetailsModal } from "@/components/scheduleChangePlans/ScheduleChangePlanDetailsModal";

import {
  QUERY_KEY,
  EMPTY_FORM,
} from "@/features/sheduleChangePlansConstant";

import {
  buildCreatePayload,
  getScheduleLabel,
  getScheduleTimeRange,
  getStatusMeta,
  normalizeEmployeeDetail,
  normalizeSchedule,
  validateForm,
} from "@/components/scheduleChangePlans/scheduleChangePlansHelpers";

import type {
  EmployeeDetailOption,
  PlanFormState,
  ScheduleChangePlanResponse,
  ScheduleOption,
} from "@/types/sheduleChangePlansType";

function ScheduleChangePlanCard({
  plan,
  employeeCount,
  schedulesMap,
  statusCatalog,
  onViewDetails,
}: {
  plan: ScheduleChangePlanResponse;
  employeeCount: number;
  schedulesMap: Map<number, ScheduleOption>;
  statusCatalog: Record<number, { label: string }>;
  onViewDetails: (plan: ScheduleChangePlanResponse) => void;
}) {
  const status = getStatusMeta(plan.statusTypeID, statusCatalog);

  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base leading-tight">{plan.title}</h3>
            <p className="text-sm text-muted-foreground">
              {plan.planCode || `Plan #${plan.planID}`}
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Fecha efectiva</p>
            <p className="font-medium">{plan.effectiveDate}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Aplicar en</p>
            <p className="font-medium">{plan.applyAfterHours} horas</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nuevo horario</p>
            <p className="font-medium">
              {getScheduleLabel(plan.newScheduleID, schedulesMap)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Colaboradores</p>
            <p className="font-medium">{employeeCount}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onViewDetails(plan)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateScheduleChangePlanDialog({
  bossId,
  open,
  onOpenChange,
  bossPlans,
  statusCatalog,
}: {
  bossId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bossPlans: ScheduleChangePlanResponse[];
  statusCatalog: Record<number, { label: string }>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [tableFilter, setTableFilter] = useState("");

  const { data: employeesResponse, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["vw-employee-details", "subordinates", bossId],
    queryFn: () => VistaDetallesEmpleadosAPI.byImmediateBoss(bossId),
    enabled: !!bossId,
    staleTime: 5 * 60_000,
  });

  const { data: schedulesResponse, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => HorariosAPI.list(),
    staleTime: 5 * 60_000,
  });

  const employees = useMemo<EmployeeDetailOption[]>(() => {
    if (employeesResponse?.status !== "success" || !Array.isArray(employeesResponse.data)) {
      return [];
    }

    return employeesResponse.data
      .map(normalizeEmployeeDetail)
      .filter((employee) => employee.employeeID > 0)
      .sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" })
      );
  }, [employeesResponse]);

  // Solo activos para selección
  const activeSchedules = useMemo<ScheduleOption[]>(() => {
    if (schedulesResponse?.status !== "success" || !Array.isArray(schedulesResponse.data)) {
      return [];
    }

    return schedulesResponse.data
      .map(normalizeSchedule)
      .filter((schedule) => schedule.isActive === true);
  }, [schedulesResponse]);

  const activeSchedulesMap = useMemo(
    () =>
      new Map<number, ScheduleOption>(
        activeSchedules.map((item) => [item.scheduleId, item])
      ),
    [activeSchedules]
  );

  const selectedEmployees = useMemo(
    () => employees.filter((employee) => form.selectedEmployeeIds.includes(employee.employeeID)),
    [employees, form.selectedEmployeeIds]
  );

  const visibleSelectedEmployees = useMemo(() => {
    const term = tableFilter.trim().toLowerCase();
    if (!term) return selectedEmployees;

    return selectedEmployees.filter((employee) => {
      const currentSchedule = getScheduleLabel(employee.scheduleID, activeSchedulesMap);
      const nextSchedule = form.newScheduleID
        ? getScheduleLabel(Number(form.newScheduleID), activeSchedulesMap)
        : "";

      const haystack = [
        employee.fullName,
        employee.email,
        employee.idCard,
        employee.department,
        employee.faculty,
        currentSchedule,
        nextSchedule,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [selectedEmployees, tableFilter, form.newScheduleID, activeSchedulesMap]);

  const selectedSchedule = activeSchedules.find(
    (schedule) => String(schedule.scheduleId) === form.newScheduleID
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const validationError = validateForm(form);
      if (validationError) throw new Error(validationError);

      const activePlans = bossPlans.filter((plan) => {
        const planStatus = plan.statusName || statusCatalog[plan.statusTypeID]?.label || "";
        const st = planStatus.toLowerCase();
        return st.includes("pendiente") || st.includes("borrador") || st.includes("aprobado");
      });

      const employeesInActivePlans = new Map<number, string>();
      activePlans.forEach((plan) => {
        const label = plan.planCode || `Plan #${plan.planID}`;
        plan.details?.forEach((detail) => employeesInActivePlans.set(detail.employeeID, label));
      });

      const conflictingEmployees = selectedEmployees.filter((emp) =>
        employeesInActivePlans.has(emp.employeeID)
      );

      if (conflictingEmployees.length > 0) {
        const names = conflictingEmployees
          .map((e) => `${e.fullName} (${employeesInActivePlans.get(e.employeeID)})`)
          .join(", ");
        throw new Error(
          `Los siguientes colaboradores ya se encuentran en una planificación activa: ${names}`
        );
      }

      const payload = buildCreatePayload(form, bossId);
      return await ScheduleChangePlansAPI.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [...QUERY_KEY, "boss", bossId],
      });

      toast({
        title: "Planificación creada",
        description: "La planificación fue registrada correctamente.",
      });

      setForm(EMPTY_FORM);
      setTableFilter("");
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "No se pudo crear la planificación",
        description: error instanceof Error ? error.message : "Error inesperado.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-uta-blue hover:bg-uta-blue/90" disabled={!bossId}>
          <FilePlus2 className="mr-2 h-4 w-4" />
          Nueva planificación
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[96vw] max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planificación de cambio de horario</DialogTitle>
          <DialogDescription>
            Registra y ejecuta planificaciones de cambio de horario para colaboradores bajo tu jefatura inmediata.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr] gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos generales</CardTitle>
                <CardDescription>
                  Define el alcance y vigencia de la planificación.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, title: e.target.value }))
                    }
                    placeholder="Ej. Ajuste horario por necesidades institucionales"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="justification">Justificación</Label>
                  <Textarea
                    id="justification"
                    value={form.justification}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, justification: e.target.value }))
                    }
                    placeholder="Describe la razón del cambio de horario"
                    className="min-h-[120px]"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Nuevo horario</Label>
                  <ActiveSchedulePicker
                    value={form.newScheduleID}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, newScheduleID: value }))
                    }
                    disabled={isLoadingSchedules}
                    schedules={activeSchedules}
                  />
                  {selectedSchedule ? (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{selectedSchedule.description || "Horario parametrizado"}</p>
                      <p>
                        Jornada: {getScheduleTimeRange(selectedSchedule)} ·{" "}
                        {selectedSchedule.workingDays || "Días no definidos"}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effectiveDate">Fecha efectiva (Inicio)</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, effectiveDate: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duración</Label>
                  <div className="flex items-center gap-6 rounded-md border p-3">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <Checkbox
                        checked={form.isPermanent}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            isPermanent: Boolean(checked),
                            temporalEndDate: Boolean(checked) ? "" : current.temporalEndDate,
                          }))
                        }
                      />
                      Permanente
                    </label>
                  </div>
                </div>

                {!form.isPermanent ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="temporalEndDate">Fecha fin</Label>
                    <Input
                      id="temporalEndDate"
                      type="date"
                      value={form.temporalEndDate}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          temporalEndDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Colaboradores afectados</CardTitle>
                <CardDescription>
                  Selecciona subordinados del jefe logueado y visualiza el horario actual y el nuevo horario.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Agregar colaboradores</Label>
                  <SubordinateEmployeePicker
                    bossId={bossId}
                    values={form.selectedEmployeeIds.map(String)}
                    onChange={(values) =>
                      setForm((current) => ({
                        ...current,
                        selectedEmployeeIds: values.map(Number),
                      }))
                    }
                    disabled={isLoadingEmployees}
                  />
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    className="pl-9"
                    placeholder="Filtrar seleccionados por nombre, correo, cédula, departamento o horario..."
                  />
                </div>

                <div className="rounded-md border overflow-hidden">
                  <div className="hidden md:grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_auto] gap-3 px-4 py-3 bg-muted/50 text-sm font-medium">
                    <div>Colaborador</div>
                    <div>Horario actual</div>
                    <div>Horario nuevo</div>
                    <div>Departamento</div>
                    <div></div>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y">
                    {visibleSelectedEmployees.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        No hay colaboradores seleccionados.
                      </div>
                    ) : (
                      visibleSelectedEmployees.map((employee) => (
                        <div
                          key={employee.employeeID}
                          className="px-4 py-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_auto] gap-3 items-start">
                            <div>
                              <p className="font-medium">{employee.fullName}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                              <p className="text-xs text-muted-foreground">
                                {employee.idCard || `ID ${employee.employeeID}`}
                              </p>
                            </div>

                            <div>
                              <Badge variant="outline">
                                {getScheduleLabel(employee.scheduleID, activeSchedulesMap)}
                              </Badge>
                            </div>

                            <div>
                              <Badge>
                                {form.newScheduleID
                                  ? getScheduleLabel(Number(form.newScheduleID), activeSchedulesMap)
                                  : "No seleccionado"}
                              </Badge>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              {employee.department || "Sin departamento"}
                            </div>

                            <div className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    selectedEmployeeIds: current.selectedEmployeeIds.filter(
                                      (id) => id !== employee.employeeID
                                    ),
                                  }))
                                }
                              >
                                Quitar
                              </Button>
                            </div>
                          </div>

                          <div className="md:hidden space-y-3">
                            <div>
                              <p className="font-medium">{employee.fullName}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                              <p className="text-xs text-muted-foreground">
                                {employee.department || "Sin departamento"}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Horario actual</p>
                                <Badge variant="outline">
                                  {getScheduleLabel(employee.scheduleID, activeSchedulesMap)}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Horario nuevo</p>
                                <Badge>
                                  {form.newScheduleID
                                    ? getScheduleLabel(Number(form.newScheduleID), activeSchedulesMap)
                                    : "No seleccionado"}
                                </Badge>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  selectedEmployeeIds: current.selectedEmployeeIds.filter(
                                    (id) => id !== employee.employeeID
                                  ),
                                }))
                              }
                            >
                              Quitar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen</CardTitle>
                <CardDescription>
                  Valida la información antes de registrar el plan.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Colaboradores</p>
                    <p className="text-2xl font-bold text-uta-blue">
                      {form.selectedEmployeeIds.length}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium">Notas por colaborador</p>

                  {selectedEmployees.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Selecciona colaboradores para registrar observaciones opcionales.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {selectedEmployees.map((employee) => (
                        <div key={employee.employeeID} className="space-y-2 rounded-md border p-3">
                          <div>
                            <p className="text-sm font-medium">{employee.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {getScheduleLabel(employee.scheduleID, activeSchedulesMap)} →{" "}
                              {form.newScheduleID
                                ? getScheduleLabel(Number(form.newScheduleID), activeSchedulesMap)
                                : "No seleccionado"}
                            </p>
                          </div>

                          <Textarea
                            value={form.notesByEmployee[employee.employeeID] ?? ""}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                notesByEmployee: {
                                  ...current.notesByEmployee,
                                  [employee.employeeID]: e.target.value,
                                },
                              }))
                            }
                            placeholder="Observación opcional para este colaborador"
                            className="min-h-[80px]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm(EMPTY_FORM);
                      setTableFilter("");
                      onOpenChange(false);
                    }}
                    disabled={createMutation.isPending}
                  >
                    Cancelar
                  </Button>

                  <Button
                    className="bg-uta-blue hover:bg-uta-blue/90"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Guardando..." : "Guardar planificación"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ScheduleChangePlansPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ScheduleChangePlanResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<number | "all">("all");
  const { employeeDetails, isLoading: isAuthLoading } = useAuth();

  const bossId = employeeDetails?.employeeID ?? 0;

  const {
    items,
    isLoading,
    isError,
    errorMessage,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    setPageSize,
    setSearch,
    clearSearch,
    currentParams,
  } = usePaged<ScheduleChangePlanResponse>({
    queryKey: QUERY_KEY.join("-"),
    queryFn: (params) => ScheduleChangePlansAPI.listPaged(params),
    initialPageSize: 10,
  });

  const { data: bossPlansResponse, isLoading: isLoadingBossPlans } = useQuery({
    queryKey: [...QUERY_KEY, "boss", bossId],
    queryFn: () => ScheduleChangePlansAPI.getByBoss(bossId),
    enabled: !!bossId,
    staleTime: 60_000,
  });

  const { data: schedulesResponse } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => HorariosAPI.list(),
    staleTime: 5 * 60_000,
  });

  const { data: planStatusResponse } = useQuery({
    queryKey: ["refTypes", "SCHEDULE_CHANGE_STATUS"],
    queryFn: () => TiposReferenciaAPI.byCategory("SCHEDULE_CHANGE_STATUS"),
    staleTime: 10 * 60_000,
  });

  // Todos los horarios para visualización histórica
  const schedules = useMemo<ScheduleOption[]>(() => {
    if (schedulesResponse?.status !== "success" || !Array.isArray(schedulesResponse.data)) {
      return [];
    }

    return schedulesResponse.data.map(normalizeSchedule);
  }, [schedulesResponse]);

  const schedulesMap = useMemo(
    () => new Map<number, ScheduleOption>(schedules.map((item) => [item.scheduleId, item])),
    [schedules]
  );

  const statusCatalog = useMemo(() => {
    const items =
      planStatusResponse?.status === "success" && Array.isArray(planStatusResponse.data)
        ? planStatusResponse.data
        : [];

    return Object.fromEntries(
      items.map((item: any) => [
        Number(item.typeID ?? item.typeId),
        {
          label: item.name ?? `Estado ${item.typeID ?? item.typeId}`,
        },
      ])
    ) as Record<number, { label: string }>;
  }, [planStatusResponse]);

  const bossPlans = useMemo(() => {
    if (bossPlansResponse?.status !== "success") return [];
    return bossPlansResponse.data;
  }, [bossPlansResponse]);

  const { data: employeesResponse } = useQuery({
    queryKey: ["vw-employee-details", "subordinates", bossId],
    queryFn: () => VistaDetallesEmpleadosAPI.byImmediateBoss(bossId),
    enabled: !!bossId,
    staleTime: 5 * 60_000,
  });

  const employeesMap = useMemo(() => {
    const list =
      employeesResponse?.status === "success" && Array.isArray(employeesResponse.data)
        ? employeesResponse.data
        : [];
    return new Map<number, string>(
      list
        .map(normalizeEmployeeDetail)
        .map((e: EmployeeDetailOption) => [e.employeeID, e.fullName])
    );
  }, [employeesResponse]);

  const filteredPlans = useMemo(() => {
    const localSearch = currentParams.search?.trim().toLowerCase();

    const source = bossId
      ? items.filter((plan) => plan.requestedByBossID === bossId)
      : items;

    return source.filter((plan) => {
      const statusName =
        plan.statusName ||
        statusCatalog[plan.statusTypeID]?.label ||
        "";

      if (statusFilter !== "all" && plan.statusTypeID !== statusFilter) return false;
      if (!localSearch) return true;

      const haystack = [
        plan.title,
        plan.planCode,
        plan.justification,
        getScheduleLabel(plan.newScheduleID, schedulesMap),
        statusName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(localSearch);
    });
  }, [items, statusFilter, currentParams.search, bossId, schedulesMap, statusCatalog]);

  const stats = useMemo(() => {
    const approved = bossPlans.filter((plan: any) => {
      const statusName =
        plan.statusName ||
        statusCatalog[plan.statusTypeID]?.label ||
        "";
      return statusName.toLowerCase().includes("aprobado");
    }).length;

    const executed = bossPlans.filter((plan: any) => {
      const statusName =
        plan.statusName ||
        statusCatalog[plan.statusTypeID]?.label ||
        "";
      return (
        statusName.toLowerCase().includes("ejecutado") ||
        statusName.toLowerCase().includes("aplicado")
      );
    }).length;

    return {
      total: bossPlans.length,
      approved,
      executed,
    };
  }, [bossPlans, statusCatalog]);

  if (isAuthLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uta-blue mx-auto" />
          <p className="text-muted-foreground mt-2">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!bossId) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">
              No fue posible identificar al jefe autenticado.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Verifica que el usuario tenga datos en vw_EmployeeDetails.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Planificación de cambios de horario
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión de planificaciones y ejecución de cambios de horario por jefatura.
          </p>
        </div>

        <CreateScheduleChangePlanDialog
          bossId={bossId}
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          bossPlans={bossPlans}
          statusCatalog={statusCatalog}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none shadow-md overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 bg-card w-24 h-24 rounded-full -mr-8 -mt-8 translate-x-4" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-primary-foreground">Planes Creados</CardTitle>
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-extrabold">{stats.total}</div>
            <p className="text-xs text-primary-foreground mt-1 opacity-80">
              Total registrados por la jefatura
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-none shadow-md overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 bg-card w-24 h-24 rounded-full -mr-8 -mt-8 translate-x-4" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-teal-100">Planes Aprobados</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-teal-100" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-extrabold">{stats.approved}</div>
            <p className="text-xs text-teal-100 mt-1 opacity-80">
              Listos para su ejecución
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-md overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 bg-card w-24 h-24 rounded-full -mr-8 -mt-8 translate-x-4" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-indigo-100">Planes Ejecutados</CardTitle>
            <Clock3 className="h-5 w-5 text-indigo-100" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-extrabold">{stats.executed}</div>
            <p className="text-xs text-indigo-100 mt-1 opacity-80">
              Cambios de horario aplicados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <span>Bandeja de planificación</span>

            <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto">
              <div className="w-full md:w-56">
                <Select
                  value={String(statusFilter)}
                  onValueChange={(val) => setStatusFilter(val === "all" ? "all" : Number(val))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" /> Todos
                      </div>
                    </SelectItem>
                    {planStatusResponse?.status === "success" &&
                      Array.isArray(planStatusResponse.data) &&
                      planStatusResponse.data.map((s: any) => {
                        const typeId = s.typeId || s.typeID;
                        return (
                          <SelectItem key={typeId} value={String(typeId)}>
                            {s.name || `Estado ${typeId}`}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex-1 xl:w-80">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={currentParams.search ?? ""}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  placeholder="Buscar por código, título, justificación o horario..."
                />
              </div>

              {currentParams.search ? (
                <Button variant="outline" onClick={clearSearch}>
                  Limpiar
                </Button>
              ) : null}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading || isLoadingBossPlans ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uta-blue mx-auto" />
              <p className="text-muted-foreground mt-2">Cargando planificaciones...</p>
            </div>
          ) : null}

          {isError ? (
            <div className="text-center py-8 text-destructive">
              Error al cargar las planificaciones: {errorMessage || "Error desconocido"}
            </div>
          ) : null}

          {!isLoading && !isLoadingBossPlans && !isError ? (
            <>
              <div className="block md:hidden">
                {filteredPlans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron planificaciones con el criterio seleccionado.
                  </div>
                ) : (
                  filteredPlans.map((plan) => (
                    <ScheduleChangePlanCard
                      key={plan.planID}
                      plan={plan}
                      employeeCount={plan.details?.length ?? 0}
                      schedulesMap={schedulesMap}
                      statusCatalog={statusCatalog}
                      onViewDetails={(p) => {
                        setSelectedPlan(p);
                        setIsDetailsOpen(true);
                      }}
                    />
                  ))
                )}
              </div>

              <div className="hidden md:block rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left px-4 py-3">Código</th>
                        <th className="text-left px-4 py-3">Título</th>
                        <th className="text-left px-4 py-3">Fecha efectiva</th>
                        <th className="text-left px-4 py-3">Horario nuevo</th>
                        <th className="text-left px-4 py-3">Aplicación</th>
                        <th className="text-left px-4 py-3">Tipo</th>
                        <th className="text-left px-4 py-3">Colaboradores</th>
                        <th className="text-left px-4 py-3">Estado</th>
                        <th className="text-right px-4 py-3">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPlans.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="h-24 text-center">
                            No se encontraron planificaciones con el criterio seleccionado.
                          </td>
                        </tr>
                      ) : (
                        filteredPlans.map((plan) => {
                          const status = getStatusMeta(plan.statusTypeID, statusCatalog);

                          return (
                            <tr
                              key={plan.planID}
                              className="border-b hover:bg-muted/40 transition-colors"
                            >
                              <td className="px-4 py-3 font-medium">
                                {plan.planCode || `#${plan.planID}`}
                              </td>

                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium">{plan.title}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {plan.justification}
                                  </p>
                                </div>
                              </td>

                              <td className="px-4 py-3">{plan.effectiveDate}</td>
                              <td className="px-4 py-3">
                                {getScheduleLabel(plan.newScheduleID, schedulesMap)}
                              </td>
                              <td className="px-4 py-3">{plan.applyAfterHours} horas</td>
                              <td className="px-4 py-3">
                                {plan.isPermanent ? "Permanente" : "Temporal"}
                              </td>
                              <td className="px-4 py-3">{plan.details?.length ?? 0}</td>
                              <td className="px-4 py-3">
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPlan(plan);
                                    setIsDetailsOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <DataPagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                onPageChange={goToPage}
                onPageSizeChange={setPageSize}
                disabled={isLoading}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <ScheduleChangePlanDetailsModal
        plan={selectedPlan}
        schedulesMap={schedulesMap}
        statusCatalog={statusCatalog}
        employeesMap={employeesMap}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  );
}