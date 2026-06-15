//src/pages/EmployeeSchedules.tsx
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePaged } from "@/hooks/pagination/usePaged";
import { DataPagination } from "@/components/ui/DataPagination";
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
import { useAuth } from "@/features/auth";
import {
  VistaDetallesEmpleadosAPI,
  HorariosAPI,
  handleApiError,
} from "@/lib/api";
import {
  Search,
  User,
  Clock,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Building,
  Users,
} from "lucide-react";
import AssignScheduleForm from "@/components/forms/AssignScheduleForm";
import EditScheduleForm from "@/components/forms/EditScheduleForm";
import type {
  Schedule,
  EmployeeSchedule,
  Employee,
} from "@/types/schedule";

/* -------------------- Helpers -------------------- */
const statusChip = {
  active: { label: "Activo", color: "bg-success/15 text-success" },
  expired: { label: "Expirado", color: "bg-destructive/15 text-destructive" },
};

function getArray<T>(resp: any): T[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (resp.status === "success") return resp.data ?? [];
  if (resp?.data && Array.isArray(resp.data)) return resp.data;
  if (resp?.results && Array.isArray(resp.results)) return resp.results;
  return [];
}

const fmtTime = (s?: string) => {
  if (!s) return "—";
  if (s.includes(":")) return s.substring(0, 5);
  return s;
};

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

const normalizeText = (v?: string | null) =>
  String(v ?? "").trim().toLowerCase();

const cleanDisplayText = (v?: string | null, fallback = "—") => {
  const value = String(v ?? "").trim();
  return value ? value : fallback;
};

/* -------------------- Normalizadores -------------------- */
const normalizeSchedule = (s: any): Schedule => ({
  scheduleId: toNumber(
    pick(s, [
      "scheduleID",
      "ScheduleID",
      "scheduleId",
      "ScheduleId",
      "id",
      "Id",
      "ID",
    ])
  ),
  name: pick(s, [
    "schedule",
    "Schedule",
    "name",
    "Name",
    "scheduleName",
    "ScheduleName",
    "description",
    "Description",
  ]),
  startTime: pick(s, [
    "startTime",
    "StartTime",
    "start_time",
    "entryTime",
    "EntryTime",
  ]),
  endTime: pick(s, ["endTime", "EndTime", "end_time", "exitTime", "ExitTime"]),
  description: pick(s, ["description", "Description", "name", "Name"]),
  isActive: Boolean(
    pick(s, ["isActive", "IsActive", "active", "Active"]) ?? true
  ),
});

const normalizeEmployee = (e: any): Employee => {
  const scheduleID = toNumber(
    pick(e, ["scheduleID", "ScheduleID", "scheduleId", "ScheduleId"])
  );

  const rawScheduleName = pick(e, [
    "scheduleName",
    "ScheduleName",
    "schedule",
    "Schedule",
  ]);

  const departmentName =
    pick(e, [
      "departmentName",
      "DepartmentName",
      "department",
      "Department",
      "area",
      "Area",
    ]) ?? "—";

  return {
    employeeID: toNumber(
      pick(e, ["employeeID", "EmployeeID", "id", "Id", "ID"])
    )!,
    fullName:
      pick(e, ["fullName", "FullName"]) ||
      `${pick(e, ["firstName", "FirstName"]) || ""} ${
        pick(e, ["lastName", "LastName"]) || ""
      }`.trim(),
    departmentName: cleanDisplayText(departmentName),
    facultyName: "—",
    email: cleanDisplayText(pick(e, ["email", "Email"]), "—"),
    employeeType: String(
      pick(e, ["employeeType", "EmployeeType", "type", "Type"]) ||
        "No especificado"
    ),
    contractType: cleanDisplayText(
      pick(e, ["contractType", "ContractType", "contracType"]),
      "—"
    ),
    idCard: cleanDisplayText(
      pick(e, ["idCard", "IdCard", "identification", "Identification"]),
      "—"
    ),
    hireDate: pick(e, ["hireDate", "HireDate"]),
    hasActiveSalary: Boolean(pick(e, ["hasActiveSalary", "HasActiveSalary"])),
    baseSalary: toNumber(pick(e, ["baseSalary", "BaseSalary"])),
    scheduleID,
    scheduleName: cleanDisplayText(rawScheduleName, ""),
    startTime: pick(e, ["startTime", "StartTime"]),
    endTime: pick(e, ["endTime", "EndTime"]),
  } as any;
};

const createEmployeeScheduleFromView = (
  employee: any
): EmployeeSchedule | null => {
  const scheduleID = toNumber(
    pick(employee, ["scheduleID", "ScheduleID", "scheduleId", "ScheduleId"])
  );

  const scheduleName = pick(employee, [
    "scheduleName",
    "ScheduleName",
    "schedule",
    "Schedule",
    "name",
    "Name",
  ]);

  if (!scheduleID && !scheduleName) return null;

  return {
    empScheduleId: 0,
    employeeId: toNumber(pick(employee, ["employeeID", "EmployeeID"]))!,
    scheduleId: scheduleID ?? 0,
    validFrom: pick(employee, [
      "validFrom",
      "ValidFrom",
      "startDate",
      "StartDate",
    ]),
    validTo: pick(employee, ["validTo", "ValidTo", "endDate", "EndDate"]),
    createdAt: pick(employee, ["createdAt", "CreatedAt"]),
    createdBy: toNumber(pick(employee, ["createdBy", "CreatedBy"])),
    updatedAt: pick(employee, ["updatedAt", "UpdatedAt"]),
    updatedBy: toNumber(pick(employee, ["updatedBy", "UpdatedBy"])),
    schedule: {
      scheduleId: scheduleID ?? 0,
      name: cleanDisplayText(scheduleName, "Horario asignado"),
      startTime: pick(employee, ["startTime", "StartTime"]),
      endTime: pick(employee, ["endTime", "EndTime"]),
      description: cleanDisplayText(scheduleName, "Horario asignado"),
      isActive: true,
    },
  };
};

export default function EmployeeSchedules() {
  const { toast } = useToast();
  useAuth(); // se mantiene por contexto de auth si el componente depende de él
  const queryClient = useQueryClient();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeSchedule, setSelectedEmployeeSchedule] =
    useState<EmployeeSchedule | null>(null);

  const [filters, setFilters] = useState({
    department: "all",
    status: "all",
  });

  const {
    items: rawEmployees,
    isLoading: loadingEmployees,
    isError: isEmployeesError,
    errorMessage: employeesError,
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
  } = usePaged<any>({
    queryKey: "employee-details",
    queryFn: (params) => VistaDetallesEmpleadosAPI.listPaged(params),
    initialPageSize: 25,
  });

  const employees: Employee[] = useMemo(() => {
    return (rawEmployees || []).map(normalizeEmployee);
  }, [rawEmployees]);

  const { data: schedulesRes } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => await HorariosAPI.list(),
    retry: 2,
  });

  const { data: globalStats } = useQuery({
    queryKey: ["employee-details-schedule-stats"],
    queryFn: () => VistaDetallesEmpleadosAPI.list(),
    staleTime: 5 * 60 * 1000,
    select: (res) => {
      const all: any[] = res?.status === "success" ? (res.data ?? []) : [];
      const withSchedule = all.filter((e) => {
        const id   = e?.scheduleID   ?? e?.ScheduleID   ?? e?.scheduleId   ?? e?.ScheduleId;
        const name = e?.scheduleName ?? e?.ScheduleName ?? e?.schedule     ?? e?.Schedule;
        return Boolean(id || (typeof name === "string" && name.trim()));
      }).length;
      return {
        total:           all.length,
        withSchedule,
        withoutSchedule: all.length - withSchedule,
      };
    },
  });

  const allSchedules: Schedule[] = useMemo(() => {
    const data = getArray<any>(schedulesRes);
    return data.map(normalizeSchedule).filter((s) => s.scheduleId != null);
  }, [schedulesRes]);

  const schedulesByEmployee = useMemo(() => {
    const map: Record<number, EmployeeSchedule> = {};
    const today = new Date().toISOString().split("T")[0];

    employees.forEach((e) => {
      const es = createEmployeeScheduleFromView(e);
      if (!es?.employeeId) return;

      const isActive =
        (!es.validTo || today <= es.validTo) &&
        (!es.validFrom || today >= es.validFrom);

      if (isActive) {
        map[es.employeeId] = es;
      }
    });

    return map;
  }, [employees]);

  const schedules: Schedule[] = useMemo(() => {
    return allSchedules.filter((schedule) => schedule.isActive !== false);
  }, [allSchedules]);

  const getEmployeeScheduleInfo = (employee: Employee) => {
    const employeeSchedule = schedulesByEmployee[employee.employeeID];

    const scheduleLabel = cleanDisplayText(
      employee.scheduleName || employeeSchedule?.schedule?.name || "",
      ""
    );

    const hasAssignedSchedule = Boolean(
      employee.scheduleID || normalizeText(scheduleLabel)
    );

    const today = new Date().toISOString().split("T")[0];

    const isActiveSchedule = employeeSchedule
      ? (!employeeSchedule.validTo || today <= employeeSchedule.validTo) &&
        (!employeeSchedule.validFrom || today >= employeeSchedule.validFrom)
      : hasAssignedSchedule;

    return {
      employeeSchedule,
      scheduleLabel,
      hasAssignedSchedule,
      isActiveSchedule,
    };
  };

  const departments = useMemo(() => {
    const unique = new Map<string, string>();

    employees.forEach((e) => {
      const raw = cleanDisplayText(e.departmentName, "");
      if (!raw || raw === "—") return;

      const key = raw.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, raw);
      }
    });

    return Array.from(unique.values()).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const departmentValue = normalizeText(emp.departmentName);
      const selectedDepartment = normalizeText(filters.department);

      const matchesDepartment =
        filters.department === "all" ||
        departmentValue === selectedDepartment;

      const { hasAssignedSchedule } = getEmployeeScheduleInfo(emp);

      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "withSchedule" && hasAssignedSchedule) ||
        (filters.status === "withoutSchedule" && !hasAssignedSchedule);

      return matchesDepartment && matchesStatus;
    });
  }, [employees, filters, schedulesByEmployee]);

  const handleAssignSchedule = (employee: Employee) => {
    setSelectedEmployee(employee);
    setAssignDialogOpen(true);
  };

  const handleEditSchedule = (employee: Employee) => {
    setSelectedEmployee(employee);
    const es = schedulesByEmployee[employee.employeeID];
    setSelectedEmployeeSchedule(es || null);
    setEditDialogOpen(true);
  };

  const handleDeleteSchedule = async (_employeeId: number) => {
    toast({
      title: "Función no disponible desde esta vista",
      description:
        "Para desasignar o terminar un horario se requiere el ID de asignación (empScheduleId). Usa la pantalla de gestión directa de asignaciones o expón ese ID en la vista.",
      variant: "destructive",
    });
  };

  const handleScheduleAssigned = () => {
    queryClient.invalidateQueries({ queryKey: ["employee-details"] });
    setAssignDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleScheduleUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["employee-details"] });
    setEditDialogOpen(false);
    setSelectedEmployee(null);
    setSelectedEmployeeSchedule(null);
  };

  if (loadingEmployees) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-muted-foreground">Cargando datos de empleados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isEmployeesError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold text-destructive">
                Error al cargar los datos
              </h3>
              <p className="mb-4 text-destructive">
                {employeesError ||
                  handleApiError({
                    code: 0,
                    message: "Error",
                  })}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["employee-details"],
                  });
                }}
              >
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Horarios
          </h1>
          <p className="mt-1 text-muted-foreground">
            Asigne y administre horarios usando la vista consolidada de
            empleados
          </p>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary p-2 rounded-full">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Total Empleados</p>
                <p className="text-2xl font-bold text-primary">
                  {globalStats?.total ?? totalCount}
                </p>
                <p className="text-xs text-muted-foreground">En el sistema</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-success p-2 rounded-full">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-success">Con Horario</p>
                <p className="text-2xl font-bold text-success">
                  {globalStats?.withSchedule ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">Empleados asignados</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-warning p-2 rounded-full">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-warning">Sin Horario</p>
                <p className="text-2xl font-bold text-warning">
                  {globalStats?.withoutSchedule ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">Sin asignación</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Buscar Empleado</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre, email, cédula, horario o contrato..."
                  value={currentParams.search ?? ""}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Departamento</Label>
              <Select
                value={filters.department}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, department: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Estado de Horario</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="withSchedule">Con horario</SelectItem>
                  <SelectItem value="withoutSchedule">Sin horario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:self-end">
              <Button
                variant="outline"
                onClick={() => {
                  clearSearch();
                  setFilters({ department: "all", status: "all" });
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredEmployees.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {employees.length === 0 ? (
                <div>
                  <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/70" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    No hay empleados
                  </h3>
                  <p className="mb-4 text-muted-foreground">
                    No se encontraron empleados en el sistema
                  </p>
                </div>
              ) : (
                <div>
                  <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/70" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    No se encontraron empleados
                  </h3>
                  <p className="mb-4 text-muted-foreground">
                    No hay empleados que coincidan con los filtros aplicados
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearSearch();
                      setFilters({ department: "all", status: "all" });
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Tipo de Contrato</TableHead>
                  <TableHead>Horario Asignado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const {
                    employeeSchedule,
                    scheduleLabel,
                    hasAssignedSchedule,
                    isActiveSchedule,
                  } = getEmployeeScheduleInfo(employee);

                  const hasSchedule = hasAssignedSchedule;
                  const isActive = isActiveSchedule;

                  return (
                    <TableRow key={employee.employeeID}>
                      <TableCell className="max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="truncate">
                            <div className="truncate font-medium">
                              {employee.fullName}
                            </div>
                            {employee.email && employee.email !== "—" && (
                              <div className="truncate text-xs text-muted-foreground">
                                {employee.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {employee.idCard || "—"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {employee.departmentName || "—"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {employee.contractType || "—"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{scheduleLabel || "—"}</span>
                          {hasSchedule && (
                            <Badge
                              className={
                                isActive
                                  ? statusChip.active.color
                                  : statusChip.expired.color
                              }
                            >
                              {isActive
                                ? statusChip.active.label
                                : statusChip.expired.label}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="space-x-2 whitespace-nowrap text-right">
                        {hasSchedule ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSchedule(employee)}
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleDeleteSchedule(employee.employeeID)
                              }
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Eliminar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAssignSchedule(employee)}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Asignar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssignScheduleForm
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        employee={selectedEmployee}
        schedules={schedules}
        onScheduleAssigned={handleScheduleAssigned}
      />

      <EditScheduleForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        employee={selectedEmployee}
        employeeSchedule={selectedEmployeeSchedule}
        schedules={schedules}
        onScheduleUpdated={handleScheduleUpdated}
      />

      <DataPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        disabled={loadingEmployees}
      />
    </div>
  );
}