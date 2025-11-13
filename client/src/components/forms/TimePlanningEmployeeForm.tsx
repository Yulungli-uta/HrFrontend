// src/components/forms/TimePlanningEmployeeForm.tsx
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  TimePlanningEmployeesAPI,
  TimePlanningExecutionsAPI,
  TiposReferenciaAPI,
  type ApiResponse
} from "@/lib/api";
import {
  RefreshCw, Download, Edit, Play, Trash2, User, Mail, Building, Timer, List, PlusCircle
} from "lucide-react";

/* ============================
 * Tipos locales
 * ============================*/
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
  startTime: string | null; // ISO datetime string
  endTime: string | null;   // ISO datetime string
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
  isOpen: boolean;
  onClose: () => void;
}

/* ============================
 * Utilidades
 * ============================*/
const formatHM = (hours?: number, minutes?: number) => {
  if (typeof hours === "number") return `${hours}h`;
  if (typeof minutes === "number") {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  return "0h";
};

const toLocaleMoney = (n?: number) => (typeof n === "number" ? `$${n.toLocaleString()}` : "N/A");

const ensureTime = (hhmmOrHms: string) => (hhmmOrHms.length === 5 ? `${hhmmOrHms}:00` : hhmmOrHms);

/* ============================
 * Componente principal
 * ============================*/
export default function TimePlanningEmployeeForm({
  planningId,
  planningTitle,
  isOpen,
  onClose,
}: TimePlanningEmployeeFormProps) {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<TimePlanningEmployee[]>([]);
  const [employeeStatusTypes, setEmployeeStatusTypes] = useState<RefType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Controls: ejecución por empleado
  const [execDialogOpen, setExecDialogOpen] = useState(false);
  const [execForEmployee, setExecForEmployee] = useState<TimePlanningEmployee | null>(null);

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
    } catch (error) {
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
    } catch (error) {
      // silencioso: no bloquea el resto
    }
  };

  useEffect(() => {
    if (isOpen && planningId) {
      loadEmployees();
      loadEmployeeStatusTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, planningId]);

  const getEmployeeStatusBadge = (statusTypeID: number) => {
    const status = employeeStatusTypes.find((s) => s.typeId === statusTypeID);
    if (!status) return <Badge variant="outline">Desconocido</Badge>;

    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "success"> = {
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

  const handleUpdateStatus = async (planEmployeeID: number, newStatusName: string) => {
    try {
      const statusType = employeeStatusTypes.find((s) => s.name === newStatusName);
      if (!statusType) {
        toast({ title: "Estado inválido", description: "No se reconoce el estado", variant: "destructive" });
        return;
      }
      const resp = await TimePlanningEmployeesAPI.update(planningId, planEmployeeID, {
        planEmployeeID,
        employeeStatusTypeID: statusType.typeId,
      });
      if (resp.status === "success") {
        toast({ title: "Actualizado", description: `Estado cambiado a "${newStatusName}"` });
        await loadEmployees();
      } else {
        toast({
          title: "Error",
          description: resp.error?.message || "No se pudo actualizar el estado",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
    }
  };

  const handleExport = () => {
    // Exportar CSV
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <User className="h-5 w-5" />
            Empleados — {planningTitle}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Gestión de empleados asignados a esta planificación
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mr-2" />
            <span className="text-sm sm:text-base">Cargando empleados…</span>
          </div>
        ) : employees.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm text-muted-foreground">{employees.length} empleado(s) asignado(s)</div>
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
                      <TableHead className="min-w-[200px]">Empleado</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[130px]">Departamento</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[120px]">Cargo</TableHead>
                      <TableHead className="min-w-[100px]">Estado</TableHead>
                      <TableHead className="min-w-[110px]">Asignado</TableHead>
                      <TableHead className="min-w-[110px]">Real</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[110px]">Monto</TableHead>
                      <TableHead className="min-w-[130px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.planEmployeeID}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{employee.employeeName}</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 mr-1" />
                              {employee.email}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground sm:hidden">
                              <Building className="h-3 w-3 mr-1" />
                              {employee.department}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center text-sm">
                            <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                            {employee.department}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {employee.position || "N/A"}
                        </TableCell>
                        <TableCell>{getEmployeeStatusBadge(employee.employeeStatusTypeID)}</TableCell>
                        <TableCell className="text-sm">
                          {formatHM(employee.assignedHours, employee.assignedMinutes)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatHM(employee.actualHours, employee.actualMinutes)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
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
                              <DropdownMenuContent align="end" className="w-48">
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
                                  className="text-xs text-red-600"
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
          <div className="text-center py-8 text-muted-foreground">
            <User className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-base mb-1">No hay empleados asignados</p>
            <p className="text-sm">Los empleados asignados aparecerán aquí</p>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Cerrar
          </Button>
        </DialogFooter>

        {/* Sub-diálogo de ejecuciones */}
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
      </DialogContent>
    </Dialog>
  );
}

/* ============================
 * Sub-diálogo de ejecuciones
 * ============================*/
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
  // Form: registrar trabajo
  const [workDate, setWorkDate] = useState<string>("");
  const [start, setStart] = useState<string>("18:00");
  const [end, setEnd] = useState<string>("20:00");
  const [comments, setComments] = useState<string>("");

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const r = await TimePlanningExecutionsAPI.getByPlanEmployee(employee.planEmployeeID!);
      if (r.status === "success") {
        setRows(r.data || []);
      } else {
        setRows([]);
        toast({ title: "Error", description: "No se pudieron cargar ejecuciones", variant: "destructive" });
      }
    } catch {
      setRows([]);
      toast({ title: "Error", description: "No se pudieron cargar ejecuciones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && employee?.planEmployeeID) {
      loadExecutions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.planEmployeeID]);

  const registerWork = async () => {
    try {
      if (!workDate) {
        toast({ title: "Falta fecha", description: "Selecciona la fecha de trabajo", variant: "destructive" });
        return;
      }
      const payload = {
        planEmployeeID: employee.planEmployeeID!,
        workDate,
        startTime: ensureTime(start),
        endTime: ensureTime(end),
        comments: comments || undefined,
      };
      const r = await TimePlanningExecutionsAPI.registerWorkTime(employee.planEmployeeID!, payload);
      if (r.status === "success") {
        toast({ title: "Registrado", description: "Tiempo de trabajo guardado" });
        setComments("");
        await loadExecutions();
        await onChanged();
      } else {
        toast({
          title: "Error",
          description: r.error?.message || "No se pudo registrar",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo registrar", variant: "destructive" });
    }
  };

  // Edición simple: solo hora fin (caso rápido)
  const updateEndTime = async (row: ExecutionRow, newEnd: string) => {
    try {
      const r = await TimePlanningExecutionsAPI.update(row.planEmployeeID, row.executionID, {
        endTime: ensureTime(newEnd),
      });
      if (r.status === "success") {
        toast({ title: "Actualizado", description: "Hora fin actualizada" });
        await loadExecutions();
        await onChanged();
      } else {
        toast({
          title: "Error",
          description: r.error?.message || "No se pudo actualizar",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo actualizar", variant: "destructive" });
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Ejecución — {employee.employeeName}
          </DialogTitle>
          <DialogDescription>Registra o revisa minutos trabajados para este empleado.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form rápido */}
          <div className="border rounded-lg p-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Hora inicio</Label>
                <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Hora fin</Label>
                <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Comentarios</Label>
                <Input placeholder="Opcional" value={comments} onChange={(e) => setComments(e.target.value)} />
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
                    <TableHead className="min-w-[140px]">Fin (editable)</TableHead>
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
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Cargando ejecuciones…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                        No hay ejecuciones registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.executionID}>
                        <TableCell className="text-sm">
                          {new Date(r.workDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.startTime ? new Date(r.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              defaultValue={
                                r.endTime
                                  ? new Date(r.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
                                  : ""
                              }
                              className="h-8 w-[120px]"
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (val) updateEndTime(r, val);
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.totalMinutes}m</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{r.regularMinutes}m</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{r.overtimeMinutes}m</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{r.nightMinutes}m</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{r.holidayMinutes}m</TableCell>
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
                      <TableCell className="hidden sm:table-cell font-medium">{total.regular}m</TableCell>
                      <TableCell className="hidden sm:table-cell font-medium">{total.overtime}m</TableCell>
                      <TableCell className="hidden sm:table-cell font-medium">{total.night}m</TableCell>
                      <TableCell className="hidden md:table-cell font-medium">{total.holiday}m</TableCell>
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

/* ============================
 * Helpers
 * ============================*/
function quote(v?: string) {
  if (!v && v !== "") return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
