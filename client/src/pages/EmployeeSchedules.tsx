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
import { useAuth } from "@/contexts/AuthContext";
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
  BarChart3,
} from "lucide-react";
import AssignScheduleForm from "@/components/forms/AssignScheduleForm";
import EditScheduleForm from "@/components/forms/EditScheduleForm";
import type {
  Schedule,
  EmployeeSchedule,
  Employee,
  ScheduleCount,
} from "@/types/schedule";

/* -------------------- Helpers -------------------- */
const statusChip = {
  active: { label: "Activo", color: "bg-green-100 text-green-800" },
  expired: { label: "Expirado", color: "bg-red-100 text-red-800" },
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

  const scheduleCounts: ScheduleCount[] = useMemo(() => {
    const counts: Record<number, ScheduleCount> = {};

    employees.forEach((emp) => {
      const scheduleInfo = getEmployeeScheduleInfo(emp);
      const scheduleId =
        scheduleInfo.employeeSchedule?.scheduleId ?? emp.scheduleID;
      const scheduleName =
        scheduleInfo.employeeSchedule?.schedule?.name || emp.scheduleName;

      if (!scheduleId || !scheduleName) return;

      if (!counts[scheduleId]) {
        counts[scheduleId] = {
          schedule: {
            scheduleId,
            name: scheduleName,
            startTime:
              scheduleInfo.employeeSchedule?.schedule?.startTime ||
              (emp as any).startTime ||
              "",
            endTime:
              scheduleInfo.employeeSchedule?.schedule?.endTime ||
              (emp as any).endTime ||
              "",
            description: scheduleName,
            isActive: true,
          },
          count: 0,
          employees: [],
        };
      }

      counts[scheduleId].count += 1;
      counts[scheduleId].employees.push(emp);
    });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [employees, schedulesByEmployee]);

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

  const stats = useMemo(() => {
    const total = employees.length;
    const withSchedule = employees.filter(
      (e) => getEmployeeScheduleInfo(e).hasAssignedSchedule
    ).length;
    const withoutSchedule = total - withSchedule;
    return { total, withSchedule, withoutSchedule };
  }, [employees, schedulesByEmployee]);

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
            <p className="mt-4 text-gray-600">Cargando datos de empleados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isEmployeesError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold text-red-800">
                Error al cargar los datos
              </h3>
              <p className="mb-4 text-red-600">
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
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Horarios
          </h1>
          <p className="mt-1 text-gray-600">
            Asigne y administre horarios usando la vista consolidada de
            empleados
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Total Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.total}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Empleados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Con Horario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.withSchedule}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Empleados con horario asignado
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Sin Horario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.withoutSchedule}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Empleados sin horario asignado
            </p>
          </CardContent>
        </Card>
      </div>

      {scheduleCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Distribución por Horario
            </CardTitle>
            <CardDescription>
              Conteo de empleados por nombre de horario reportado en la vista
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scheduleCounts.map(({ schedule, count, employees }) => (
                <Card
                  key={schedule.scheduleId ?? schedule.name}
                  className="border-l-4 border-l-purple-500"
                >
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{schedule.name}</h3>
                        {(schedule.startTime || schedule.endTime) && (
                          <p className="text-sm text-gray-600">
                            {fmtTime(schedule.startTime)} -{" "}
                            {fmtTime(schedule.endTime)}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-purple-100 px-3 py-1 text-lg text-purple-800">
                        {count}
                      </Badge>
                    </div>

                    {employees.length > 0 && (
                      <div className="mt-2">
                        <p className="mb-1 text-xs font-medium text-gray-500">
                          Empleados:
                        </p>
                        <div className="max-h-20 space-y-1 overflow-y-auto">
                          {employees.slice(0, 5).map((emp) => (
                            <div
                              key={emp.employeeID}
                              className="truncate text-xs text-gray-600"
                            >
                              {emp.fullName}
                            </div>
                          ))}
                          {employees.length > 5 && (
                            <div className="text-xs text-gray-500">
                              +{employees.length - 5} más...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label className="text-xs text-gray-500">Buscar Empleado</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Nombre, email, cédula, horario o contrato..."
                  value={currentParams.search ?? ""}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="min-w-[200px]">
              <Label className="text-xs text-gray-500">Departamento</Label>
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
              <Label className="text-xs text-gray-500">Estado de Horario</Label>
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
            <div className="py-8 text-center text-gray-500">
              {employees.length === 0 ? (
                <div>
                  <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    No hay empleados
                  </h3>
                  <p className="mb-4 text-gray-600">
                    No se encontraron empleados en el sistema
                  </p>
                </div>
              ) : (
                <div>
                  <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    No se encontraron empleados
                  </h3>
                  <p className="mb-4 text-gray-600">
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
                          <User className="h-4 w-4 text-gray-500" />
                          <div className="truncate">
                            <div className="truncate font-medium">
                              {employee.fullName}
                            </div>
                            {employee.email && employee.email !== "—" && (
                              <div className="truncate text-xs text-gray-500">
                                {employee.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {employee.idCard || "—"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
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