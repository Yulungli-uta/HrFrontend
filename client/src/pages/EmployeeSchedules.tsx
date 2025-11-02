import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { VistaDetallesEmpleadosAPI, HorariosAPI, handleApiError } from "@/lib/api";
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

const fmtDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
};

const fmtTime = (s?: string) => {
  if (!s) return "—";
  if (s.includes(":")) return s.substring(0, 5);
  return s;
};

const pick = (obj: any, names: string[]) => {
  for (const n of names)
    if (obj?.[n] !== undefined && obj?.[n] !== null) return obj[n];
  return undefined;
};

const toNumber = (v: any) => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
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
  isActive: Boolean(pick(s, ["isActive", "IsActive", "active", "Active"]) ?? true),
});

// Normalizador alineado a la vista EmployeeDetails que enviaste
const normalizeEmployee = (e: any): Employee => {
  const scheduleID = toNumber(pick(e, ["scheduleID", "ScheduleID"]));
  const scheduleData = pick(e, ["schedule", "Schedule"]);

  return {
    employeeID: toNumber(pick(e, ["employeeID", "EmployeeID", "id", "Id", "ID"]))!,
    fullName:
      pick(e, ["fullName", "FullName"]) ||
      `${pick(e, ["firstName", "FirstName"]) || ""} ${
        pick(e, ["lastName", "LastName"]) || ""
      }`.trim(),
    departmentName:
      pick(e, ["department", "departmentName", "DepartmentName", "Department"]) ||
      "—",
    facultyName: "—", // No viene en el JSON que compartiste
    email: pick(e, ["email", "Email"]) || "—",
    // Muestra la DESCRIPCIÓN de contrato (contractType). El backend manda "contracType".
    employeeType: String(
      pick(e, ["employeeType", "EmployeeType", "type", "Type"]) ||
        "No especificado"
    ),
    contractType: pick(e, ["contractType", "contracType"]) || "—",
    idCard: pick(e, ["idCard", "IdCard", "identification"]),
    hireDate: pick(e, ["hireDate", "HireDate"]),
    hasActiveSalary: Boolean(pick(e, ["hasActiveSalary", "HasActiveSalary"])),
    baseSalary: toNumber(pick(e, ["baseSalary", "BaseSalary"])),
    // info de horario desde la vista
    scheduleID,
    scheduleName: scheduleData,
    // posibles tiempos si la vista los trae (por si luego los usamos)
    startTime: pick(e, ["startTime", "StartTime"]),
    endTime: pick(e, ["endTime", "EndTime"]),
  } as any;
};

// Construye un EmployeeSchedule "virtual" usando lo que trae la vista
const createEmployeeScheduleFromView = (
  employee: any
): EmployeeSchedule | null => {
  const scheduleID = toNumber(pick(employee, ["scheduleID", "ScheduleID"]));
  const scheduleName = pick(employee, ["schedule", "Schedule"]);

  if (!scheduleID || !scheduleName) return null;

  return {
    empScheduleId: 0, // no disponible en la vista
    employeeId: toNumber(pick(employee, ["employeeID", "EmployeeID"]))!,
    scheduleId: scheduleID,
    validFrom: pick(employee, ["validFrom", "ValidFrom", "startDate", "StartDate"]),
    validTo: pick(employee, ["validTo", "ValidTo", "endDate", "EndDate"]),
    createdAt: pick(employee, ["createdAt", "CreatedAt"]),
    createdBy: toNumber(pick(employee, ["createdBy", "CreatedBy"])),
    updatedAt: pick(employee, ["updatedAt", "UpdatedAt"]),
    updatedBy: toNumber(pick(employee, ["updatedBy", "UpdatedBy"])),
    schedule: {
      scheduleId: scheduleID,
      name: scheduleName,
      startTime: pick(employee, ["startTime", "StartTime"]),
      endTime: pick(employee, ["endTime", "EndTime"]),
      description: scheduleName,
      isActive: true,
    },
  };
};

/* -------------------- Página -------------------- */
export default function EmployeeSchedules() {
  const { toast } = useToast();
  const { employeeDetails } = useAuth();
  const queryClient = useQueryClient();

  // Diálogos
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeSchedule, setSelectedEmployeeSchedule] =
    useState<EmployeeSchedule | null>(null);

  // Filtros
  const [filters, setFilters] = useState({
    q: "",
    department: "all",
    status: "all",
  });

  // Consulta para empleados
  const {
    data: employeesRes,
    isLoading: loadingEmployees,
    error: employeesError,
  } = useQuery({
    queryKey: ["employee-details"],
    queryFn: async () => await VistaDetallesEmpleadosAPI.list(),
    retry: 2,
  });

  // NUEVA CONSULTA: Obtener todos los horarios disponibles
  const {
    data: schedulesRes,
    isLoading: loadingSchedules,
    error: schedulesError,
  } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => await HorariosAPI.list(),
    retry: 2,
  });

  // Normalización
  const employees: Employee[] = useMemo(() => {
    const data = getArray<any>(employeesRes);
    return data.map(normalizeEmployee).filter((e) => e.employeeID != null);
  }, [employeesRes]);

  // NUEVO: Normalización de todos los horarios disponibles
  const allSchedules: Schedule[] = useMemo(() => {
    const data = getArray<any>(schedulesRes);
    return data.map(normalizeSchedule).filter((s) => s.scheduleId != null);
  }, [schedulesRes]);

  // Mapa de horario actual por empleado (derivado de la vista)
  const schedulesByEmployee = useMemo(() => {
    const map: Record<number, EmployeeSchedule> = {};
    const today = new Date().toISOString().split("T")[0];

    employees.forEach((e) => {
      const es = createEmployeeScheduleFromView(e);
      if (!es?.employeeId) return;

      const isActive =
        (!es.validTo || today <= es.validTo) &&
        (!es.validFrom || today >= es.validFrom);

      if (isActive) map[es.employeeId] = es;
    });

    return map;
  }, [employees]);

  // Lista de horarios únicos (para los formularios) - AHORA usa allSchedules
  const schedules: Schedule[] = useMemo(() => {
    return allSchedules.filter(schedule => schedule.isActive !== false);
  }, [allSchedules]);

  // Conteo por horario (usando la vista + tiempos desde schedulesByEmployee)
  const scheduleCounts: ScheduleCount[] = useMemo(() => {
    const counts: Record<number, ScheduleCount> = {};

    employees.forEach((emp) => {
      const es = schedulesByEmployee[emp.employeeID];
      const scheduleId = es?.scheduleId ?? emp.scheduleID;
      const scheduleName = es?.schedule?.name ?? (emp as any).scheduleName;

      if (!scheduleId || !scheduleName) return;

      if (!counts[scheduleId]) {
        counts[scheduleId] = {
          schedule: {
            scheduleId,
            name: scheduleName,
            startTime: es?.schedule?.startTime || (emp as any).startTime || "",
            endTime: es?.schedule?.endTime || (emp as any).endTime || "",
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

  // Filtrado
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = filters.q.trim().toLowerCase();
      const matchesSearch =
        !q ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.idCard?.toLowerCase().includes(q) ||
        (emp as any).scheduleName?.toLowerCase?.().includes(q) ||
        emp.contractType?.toLowerCase?.().includes(q);

      const matchesDepartment =
        filters.department === "all" || emp.departmentName === filters.department;

      const hasActiveSchedule = schedulesByEmployee[emp.employeeID] != null;
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "withSchedule" && hasActiveSchedule) ||
        (filters.status === "withoutSchedule" && !hasActiveSchedule);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, filters, schedulesByEmployee]);

  // Departamentos para filtro
  const departments = useMemo(() => {
    const depts = new Set(employees.map((e) => e.departmentName).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = employees.length;
    const withSchedule = employees.filter(
      (e) => schedulesByEmployee[e.employeeID]
    ).length;
    const withoutSchedule = total - withSchedule;
    return { total, withSchedule, withoutSchedule };
  }, [employees, schedulesByEmployee]);

  /* -------------------- Acciones -------------------- */
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

  const handleDeleteSchedule = async (employeeId: number) => {
    // Con la vista no tenemos empScheduleId real. Dejo aviso claro.
    toast({
      title: "Función no disponible desde esta vista",
      description:
        "Para desasignar/terminar un horario se requiere el ID de asignación (empScheduleId). Usa la pantalla de gestión directa de asignaciones o expón ese ID en la vista.",
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

  /* -------------------- Loading / Error -------------------- */
  if (loadingEmployees) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos de empleados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (employeesError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Error al cargar los datos
              </h3>
              <p className="text-red-600 mb-4">
                {(employeesError as Error)?.message ||
                  handleApiError(
                    (employeesError as any)?.error ?? {
                      code: 0,
                      message: "Error",
                    }
                  )}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["employee-details"] });
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

  /* -------------------- UI -------------------- */
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Horarios</h1>
          <p className="text-gray-600 mt-1">
            Asigne y administre horarios usando la vista consolidada de empleados
          </p>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Total Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-sm text-gray-500 mt-1">Empleados en el sistema</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
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
            <p className="text-sm text-gray-500 mt-1">
              Empleados con horario asignado
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
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
            <p className="text-sm text-gray-500 mt-1">
              Empleados sin horario asignado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteo por Horario */}
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
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{schedule.name}</h3>
                        {(schedule.startTime || schedule.endTime) && (
                          <p className="text-sm text-gray-600">
                            {fmtTime(schedule.startTime)} - {fmtTime(schedule.endTime)}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 text-lg px-3 py-1">
                        {count}
                      </Badge>
                    </div>
                    {employees.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Empleados:
                        </p>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {employees.slice(0, 5).map((emp) => (
                            <div
                              key={emp.employeeID}
                              className="text-xs text-gray-600 truncate"
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

      {/* Filtros + Tabla */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
            <div className="flex-1">
              <Label className="text-xs text-gray-500">Buscar Empleado</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Nombre, email, cédula, horario o contrato..."
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
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
                    <SelectItem key={dept} value={dept!}>
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
                onClick={() => setFilters({ q: "", department: "all", status: "all" })}
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
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No hay empleados
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No se encontraron empleados en el sistema
                  </p>
                </div>
              ) : (
                <div>
                  <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No se encontraron empleados
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No hay empleados que coincidan con los filtros aplicados
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters({ q: "", department: "all", status: "all" })
                    }
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
                  const employeeSchedule = schedulesByEmployee[employee.employeeID];
                  const hasSchedule = !!employeeSchedule;
                  const today = new Date().toISOString().split("T")[0];
                  const isActive =
                    hasSchedule &&
                    (!employeeSchedule.validTo ||
                      today <= employeeSchedule.validTo) &&
                    (!employeeSchedule.validFrom ||
                      today >= employeeSchedule.validFrom);

                  return (
                    <TableRow key={employee.employeeID}>
                      <TableCell className="max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div className="truncate">
                            <div className="font-medium truncate">
                              {employee.fullName}
                            </div>
                            {employee.email && employee.email !== "—" && (
                              <div className="text-xs text-gray-500 truncate">
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
                          <span>{(employee as any).scheduleName || "—"}</span>
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
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        {hasSchedule ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSchedule(employee)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleDeleteSchedule(employee.employeeID)
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAssignSchedule(employee)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
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

      {/* Diálogos */}
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
    </div>
  );
}