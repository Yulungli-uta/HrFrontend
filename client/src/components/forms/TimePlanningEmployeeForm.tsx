import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  TimePlanningEmployeesAPI,
  TimePlanningExecutionsAPI,
  TiposReferenciaAPI,
  VistaEmpleadosAPI,
} from "@/lib/api";
import {
  RefreshCw,
  Download,
  Edit,
  Play,
  Trash2,
  User,
  Mail,
  Building,
  Timer,
  List,
  PlusCircle,
  Check,
  ChevronsUpDown,
  Loader2,
  Search,
  ClipboardList,
} from "lucide-react";
import { parseApiError } from "@/lib/error-handling";
import { cn } from "@/lib/utils";
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
import { usePagedCombobox } from "@/hooks/usePagedCombobox";

interface TimePlanningEmployee {
  planEmployeeID?: number;
  planID: number;
  employeeID: number;
  assignedHours?: number;
  assignedMinutes?: number;
  actualHours?: number;
  actualMinutes?: number;
  employeeStatusTypeID: number;
  employeeStatusName?: string;
  paymentAmount?: number;
  isEligible: boolean;
  eligibilityReason?: string;
  createdAt: string;
  employeeName?: string;
  department?: string;
  position?: string;
  email?: string;
}

interface RefType {
  typeId: number;
  category: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface ExecutionRow {
  executionID: number;
  planEmployeeID: number;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  holidayMinutes: number;
  verifiedBy?: number | null;
  verifiedAt?: string | null;
  comments?: string | null;
  createdAt: string;
}

interface TimePlanningEmployeeFormProps {
  planningId: number;
  planningTitle: string;
  onClose: () => void;
}

const formatHM = (hours?: number, minutes?: number) => {
  if (typeof hours === "number") return `${hours}h`;
  if (typeof minutes === "number") {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  return "0h";
};

const toLocaleMoney = (n?: number) =>
  typeof n === "number" ? `$${n.toLocaleString()}` : "N/A";

const ensureTime = (hhmmOrHms: string) =>
  hhmmOrHms.length === 5 ? `${hhmmOrHms}:00` : hhmmOrHms;

function quote(v?: string) {
  if (!v && v !== "") return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function TimePlanningEmployeeForm({
  planningId,
  planningTitle,
  onClose,
}: TimePlanningEmployeeFormProps) {
  const { toast } = useToast();

  const [employees, setEmployees] = useState<TimePlanningEmployee[]>([]);
  const [employeeStatusTypes, setEmployeeStatusTypes] = useState<RefType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [execDialogOpen, setExecDialogOpen] = useState(false);
  const [execForEmployee, setExecForEmployee] =
    useState<TimePlanningEmployee | null>(null);

  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeLabel, setSelectedEmployeeLabel] = useState<string | null>(
    null
  );
  const [isAssigning, setIsAssigning] = useState(false);

  const loadEmployees = async () => {
    if (!planningId) return;

    try {
      setIsLoading(true);
      const response = await TimePlanningEmployeesAPI.getByPlan(planningId);

      if (response.status === "success") {
        setEmployees(response.data || []);
      } else {
        setEmployees([]);
        toast({
          title: "Error",
          description: "Error al cargar los empleados de la planificación",
          variant: "destructive",
        });
      }
    } catch {
      setEmployees([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployeeStatusTypes = async () => {
    try {
      const response = await TiposReferenciaAPI.byCategory("EMPLOYEE_PLAN_STATUS");
      if (response.status === "success") {
        setEmployeeStatusTypes(response.data || []);
      }
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    if (planningId) {
      loadEmployees();
      loadEmployeeStatusTypes();
    }
  }, [planningId]);

  const assignedIds = useMemo(
    () => new Set(employees.map((e) => Number(e.employeeID))),
    [employees]
  );

  const mapEmployee = useCallback((e: any) => {
    const id = Number(e?.employeeID ?? e?.employeeId ?? e?.id ?? 0);
    if (!id || id <= 0) return null;

    const fullName = String(
      e?.fullName ?? `${e?.firstName ?? ""} ${e?.lastName ?? ""}`.trim()
    ).trim();

    return {
      value: id,
      label: fullName || `Empleado #${id}`,
      detail: e?.idCard ?? undefined,
      extra: e?.department ?? e?.email ?? undefined,
      raw: e,
    };
  }, []);

  const employeeCombobox = usePagedCombobox<any>({
    queryKey: "planning-employees-selector",
    queryFn: (params) => VistaEmpleadosAPI.listPaged(params),
    mapFn: mapEmployee,
    enabled: Boolean(planningId),
    initialPageSize: 10,
    debounceMs: 400,
  });

  const availableEmployeeOptions = useMemo(() => {
    return employeeCombobox.options.filter((opt) => !assignedIds.has(Number(opt.value)));
  }, [employeeCombobox.options, assignedIds]);

  const assignedStatusTypeId = useMemo(() => {
    return (
      employeeStatusTypes.find((x) => x.name.toLowerCase() === "asignado")?.typeId ??
      0
    );
  }, [employeeStatusTypes]);

  const getEmployeeStatusBadge = (statusTypeID: number) => {
    const status = employeeStatusTypes.find((s) => s.typeId === statusTypeID);
    if (!status) return <Badge variant="outline">Desconocido</Badge>;

    const variantMap: Record<
      string,
      "default" | "secondary" | "destructive" | "outline" | "success"
    > = {
      Asignado: "secondary",
      "En Progreso": "default",
      Completado: "success",
      Cancelado: "destructive",
      Ausente: "outline",
      Aprobado: "success",
      Rechazado: "destructive",
    };

    return (
      <Badge variant={variantMap[status.name] || "outline"} className="text-xs">
        {status.name}
      </Badge>
    );
  };

  const handleUpdateStatus = async (
    planEmployeeID: number,
    newStatusName: string
  ) => {
    try {
      const statusType = employeeStatusTypes.find((s) => s.name === newStatusName);

      if (!statusType) {
        toast({
          title: "Estado inválido",
          description: "No se reconoce el estado",
          variant: "destructive",
        });
        return;
      }

      const resp = await TimePlanningEmployeesAPI.update(planningId, planEmployeeID, {
        planEmployeeID,
        employeeStatusTypeID: statusType.typeId,
      });

      if (resp.status === "success") {
        toast({
          title: "Actualizado",
          description: `Estado cambiado a "${newStatusName}"`,
        });
        await loadEmployees();
      } else {
        toast({
          title: "Error",
          description: resp.error.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const handleAssignEmployee = async () => {
    try {
      if (!selectedEmployeeId) {
        toast({
          title: "Seleccione un empleado",
          description: "Debe elegir un empleado para asignar.",
          variant: "destructive",
        });
        return;
      }

      if (!assignedStatusTypeId) {
        toast({
          title: "Error de configuración",
          description: "No se encontró el estado 'Asignado'.",
          variant: "destructive",
        });
        return;
      }

      setIsAssigning(true);

      const payload = {
        planID: planningId,
        employeeID: selectedEmployeeId,
        employeeStatusTypeID: assignedStatusTypeId,
        isEligible: true,
      };

      const resp = await (TimePlanningEmployeesAPI as any).addEmployee(
        planningId,
        payload
      );

      if (resp?.status === "success") {
        toast({
          title: "Empleado asignado",
          description: "El empleado fue agregado a la planificación.",
        });

        setSelectedEmployeeId(null);
        setSelectedEmployeeLabel(null);
        setEmployeeSearchOpen(false);
        employeeCombobox.reset();

        await loadEmployees();
      } else {
        toast({
          title: "Error",
          description: resp?.error?.message || "No se pudo asignar el empleado.",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "PlanEmployeeID",
      "PlanID",
      "EmployeeID",
      "EmployeeName",
      "Department",
      "Position",
      "Email",
      "StatusTypeID",
      "AssignedHours",
      "AssignedMinutes",
      "ActualHours",
      "ActualMinutes",
      "PaymentAmount",
      "IsEligible",
      "EligibilityReason",
      "CreatedAt",
    ];

    const rows = employees.map((e) => [
      e.planEmployeeID ?? "",
      e.planID,
      e.employeeID,
      quote(e.employeeName),
      quote(e.department),
      quote(e.position),
      quote(e.email),
      e.employeeStatusTypeID,
      e.assignedHours ?? "",
      e.assignedMinutes ?? "",
      e.actualHours ?? "",
      e.actualMinutes ?? "",
      e.paymentAmount ?? "",
      e.isEligible ? "1" : "0",
      quote(e.eligibilityReason),
      e.createdAt,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const safeTitle = planningTitle?.replace(/[^\w\-]+/g, "_") || "plan";
    a.download = `planning_employees_${safeTitle}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const openExecFor = (emp: TimePlanningEmployee) => {
    setExecForEmployee(emp);
    setExecDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-card space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg border bg-background">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Empleados asignados</h3>
                <p className="text-xs text-muted-foreground">
                  Gestiona los empleados relacionados con la planificación y su
                  ejecución.
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Planificación: <span className="font-medium">{planningTitle}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeeSearchOpen}
                  className="w-full md:flex-1 justify-between font-normal"
                  disabled={isAssigning}
                >
                  <span className="truncate">
                    {selectedEmployeeLabel ?? "Buscar empleado..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[380px] sm:w-[460px] p-0" align="start">
                <Command shouldFilter={false}>
                  <div className="border-b px-3 py-2 flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <CommandInput
                      placeholder="Buscar por nombre, cédula o correo..."
                      value={employeeCombobox.searchTerm}
                      onValueChange={employeeCombobox.setSearchTerm}
                    />
                  </div>

                  <CommandList>
                    {employeeCombobox.isLoading || employeeCombobox.isFetching ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                          Buscando...
                        </span>
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No se encontraron empleados.</CommandEmpty>

                        <CommandGroup>
                          {availableEmployeeOptions.map((opt) => (
                            <CommandItem
                              key={String(opt.value)}
                              value={String(opt.value)}
                              onSelect={() => {
                                setSelectedEmployeeId(Number(opt.value));
                                setSelectedEmployeeLabel(
                                  `${opt.label}${opt.detail ? ` — ${opt.detail}` : ""}`
                                );
                                setEmployeeSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEmployeeId === Number(opt.value)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />

                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">
                                  {opt.label}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {opt.detail || "Sin detalle"}
                                  {opt.extra ? ` · ${opt.extra}` : ""}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>

                        <div className="border-t p-2 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-muted-foreground">
                            Página {employeeCombobox.page} de {employeeCombobox.totalPages} ·{" "}
                            {employeeCombobox.totalCount} resultado(s)
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={employeeCombobox.goPrev}
                              disabled={
                                employeeCombobox.isLoading ||
                                employeeCombobox.isFetching ||
                                !employeeCombobox.hasPreviousPage
                              }
                            >
                              Anterior
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={employeeCombobox.goNext}
                              disabled={
                                employeeCombobox.isLoading ||
                                employeeCombobox.isFetching ||
                                !employeeCombobox.hasNextPage
                              }
                            >
                              Siguiente
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              onClick={handleAssignEmployee}
              disabled={!selectedEmployeeId || isAssigning}
              className="md:w-auto"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Agregar
                </>
              )}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <RefreshCw className="h-8 w-8 animate-spin mr-2" />
            <span className="text-sm sm:text-base">Cargando empleados…</span>
          </div>
        ) : employees.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {employees.length} empleado(s) asignado(s)
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadEmployees} className="text-xs">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refrescar
                </Button>

                <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Exportar
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Empleado</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[140px]">
                        Departamento
                      </TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[140px]">
                        Cargo
                      </TableHead>
                      <TableHead className="min-w-[110px]">Estado</TableHead>
                      <TableHead className="min-w-[120px]">Asignado</TableHead>
                      <TableHead className="min-w-[120px]">Real</TableHead>
                      <TableHead className="hidden xl:table-cell min-w-[110px]">
                        Pago
                      </TableHead>
                      <TableHead className="text-right min-w-[140px]">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.planEmployeeID}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {employee.employeeName || `Empleado #${employee.employeeID}`}
                            </div>

                            <div className="flex items-center text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 mr-1" />
                              {employee.email || "Sin correo"}
                            </div>

                            <div className="flex items-center text-xs text-muted-foreground md:hidden">
                              <Building className="h-3 w-3 mr-1" />
                              {employee.department || "Sin departamento"}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center text-sm">
                            <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                            {employee.department || "N/A"}
                          </div>
                        </TableCell>

                        <TableCell className="hidden lg:table-cell text-sm">
                          {employee.position || "N/A"}
                        </TableCell>

                        <TableCell>
                          {getEmployeeStatusBadge(employee.employeeStatusTypeID)}
                        </TableCell>

                        <TableCell className="text-sm">
                          {formatHM(employee.assignedHours, employee.assignedMinutes)}
                        </TableCell>

                        <TableCell className="text-sm">
                          {formatHM(employee.actualHours, employee.actualMinutes)}
                        </TableCell>

                        <TableCell className="hidden xl:table-cell text-sm">
                          {toLocaleMoney(employee.paymentAmount)}
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                  Acciones
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateStatus(employee.planEmployeeID!, "En Progreso")
                                  }
                                  className="text-xs"
                                >
                                  <Play className="h-3.5 w-3.5 mr-2" />
                                  Iniciar trabajo
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateStatus(employee.planEmployeeID!, "Completado")
                                  }
                                  className="text-xs"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-2" />
                                  Marcar completado
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateStatus(employee.planEmployeeID!, "Cancelado")
                                  }
                                  className="text-xs text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => openExecFor(employee)}
                                  className="text-xs"
                                >
                                  <List className="h-3.5 w-3.5 mr-2" />
                                  Ver/Registrar ejecución
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground border rounded-lg bg-card">
            <User className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay empleados asignados</p>
            <p className="text-sm">
              Usa la búsqueda paginada de arriba para agregarlos
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onClose} className="w-full sm:w-auto">
          Cerrar
        </Button>
      </DialogFooter>

      {execForEmployee && (
        <ExecutionDialog
          open={execDialogOpen}
          onOpenChange={setExecDialogOpen}
          employee={execForEmployee}
          onChanged={async () => {
            await loadEmployees();
          }}
        />
      )}
    </>
  );
}

function ExecutionDialog({
  open,
  onOpenChange,
  employee,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: TimePlanningEmployee;
  onChanged: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExecutionRow[]>([]);

  const [workDate, setWorkDate] = useState<string>("");
  const [start, setStart] = useState<string>("18:00");
  const [end, setEnd] = useState<string>("20:00");
  const [comments, setComments] = useState<string>("");

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const r = await TimePlanningExecutionsAPI.getByPlanEmployee(
        employee.planEmployeeID!
      );

      if (r.status === "success") {
        setRows(r.data || []);
      } else {
        setRows([]);
        toast({
          title: "Error",
          description: "No se pudieron cargar ejecuciones",
          variant: "destructive",
        });
      }
    } catch {
      setRows([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar ejecuciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && employee?.planEmployeeID) {
      loadExecutions();
    }
  }, [open, employee?.planEmployeeID]);

  const registerWork = async () => {
    try {
      if (!workDate) {
        toast({
          title: "Falta fecha",
          description: "Selecciona la fecha de trabajo",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        planEmployeeID: employee.planEmployeeID!,
        workDate,
        startTime: ensureTime(start),
        endTime: ensureTime(end),
        comments: comments || undefined,
      };

      const r = await TimePlanningExecutionsAPI.registerWorkTime(
        employee.planEmployeeID!,
        payload
      );

      if (r.status === "success") {
        toast({
          title: "Registrado",
          description: "Tiempo de trabajo guardado",
        });

        setComments("");
        await loadExecutions();
        await onChanged();
      } else {
        toast({
          title: "Error",
          description: r.error.message,
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    }
  };

  const updateEndTime = async (row: ExecutionRow, newEnd: string) => {
    try {
      const r = await TimePlanningExecutionsAPI.update(
        row.planEmployeeID,
        row.executionID,
        {
          executionID: row.executionID,
          endTime: ensureTime(newEnd),
        }
      );

      if (r.status === "success") {
        toast({
          title: "Actualizado",
          description: "Hora fin actualizada",
        });

        await loadExecutions();
        await onChanged();
      } else {
        toast({
          title: "Error",
          description: r.error.message,
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: parseApiError(e).message,
        variant: "destructive",
      });
    }
  };

  const total = rows.reduce(
    (acc, r) => {
      acc.total += r.totalMinutes || 0;
      acc.regular += r.regularMinutes || 0;
      acc.overtime += r.overtimeMinutes || 0;
      acc.night += r.nightMinutes || 0;
      acc.holiday += r.holidayMinutes || 0;
      return acc;
    },
    { total: 0, regular: 0, overtime: 0, night: 0, holiday: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Ejecución — {employee.employeeName}
          </DialogTitle>
          <DialogDescription>
            Registra o revisa minutos trabajados para este empleado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Hora inicio</Label>
                <Input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Hora fin</Label>
                <Input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Comentarios</Label>
                <Input
                  placeholder="Opcional"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3">
              <Button size="sm" onClick={registerWork}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Registrar tiempo
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[110px]">Fecha</TableHead>
                    <TableHead className="min-w-[120px]">Inicio</TableHead>
                    <TableHead className="min-w-[140px]">Fin</TableHead>
                    <TableHead className="min-w-[110px]">Total</TableHead>
                    <TableHead className="hidden sm:table-cell">Reg.</TableHead>
                    <TableHead className="hidden sm:table-cell">HE</TableHead>
                    <TableHead className="hidden sm:table-cell">Noct.</TableHead>
                    <TableHead className="hidden md:table-cell">Feriado</TableHead>
                    <TableHead className="hidden lg:table-cell">Obs.</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <div className="flex items-center justify-center py-6 text-sm">
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Cargando ejecuciones…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-6"
                      >
                        No hay ejecuciones registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.executionID}>
                        <TableCell className="text-sm">
                          {new Date(`${r.workDate}T00:00:00`).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="text-sm">
                          {r.startTime
                            ? new Date(r.startTime).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <Input
                            type="time"
                            defaultValue={
                              r.endTime
                                ? new Date(r.endTime).toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  })
                                : ""
                            }
                            className="h-8 w-[120px]"
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val) updateEndTime(r, val);
                            }}
                          />
                        </TableCell>

                        <TableCell className="text-sm">{r.totalMinutes}m</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {r.regularMinutes}m
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {r.overtimeMinutes}m
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {r.nightMinutes}m
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {r.holidayMinutes}m
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {r.comments || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}

                  {rows.length > 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        Totales:
                      </TableCell>
                      <TableCell className="font-medium">{total.total}m</TableCell>
                      <TableCell className="hidden sm:table-cell font-medium">
                        {total.regular}m
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-medium">
                        {total.overtime}m
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-medium">
                        {total.night}m
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-medium">
                        {total.holiday}m
                      </TableCell>
                      <TableCell className="hidden lg:table-cell" />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}