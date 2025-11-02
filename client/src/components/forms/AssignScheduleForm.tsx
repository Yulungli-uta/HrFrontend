// src/components/schedules/AssignScheduleForm.tsx
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { HorariosEmpleadosAPI, handleApiError } from "@/lib/api";
import type { Employee, Schedule, EmployeeSchedule } from "@/types/schedule";

interface AssignScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  schedules: Schedule[];
  existingEmployeeSchedule?: EmployeeSchedule | null;
  onScheduleAssigned: () => void;
}

const fmtTime = (s?: string) => {
  if (!s) return "—";
  if (s.includes(':')) {
    return s.substring(0, 5);
  }
  return s;
};

// Función para calcular fechas
const getToday = () => new Date().toISOString().split('T')[0];
const getTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};
const getMaxDate = () => "9999-12-31";

export default function AssignScheduleForm({
  open,
  onOpenChange,
  employee,
  schedules,
  existingEmployeeSchedule,
  onScheduleAssigned,
}: AssignScheduleFormProps) {
  const { toast } = useToast();
  const { employeeDetails } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    scheduleId: "",
    validFrom: getTomorrow(), // Por defecto empieza mañana
    validTo: getMaxDate(),
  });

  // Efecto para inicializar el formulario cuando cambia el empleado
  useEffect(() => {
    if (employee && existingEmployeeSchedule) {
      // Si ya tiene un horario, el nuevo empieza mañana
      setFormData({
        scheduleId: "",
        validFrom: getTomorrow(),
        validTo: getMaxDate(),
      });
    } else if (employee) {
      // Si no tiene horario, puede empezar hoy
      setFormData({
        scheduleId: "",
        validFrom: getToday(),
        validTo: getMaxDate(),
      });
    }
  }, [employee, existingEmployeeSchedule]);

  const resetForm = () => {
    if (existingEmployeeSchedule) {
      setFormData({
        scheduleId: "",
        validFrom: getTomorrow(),
        validTo: getMaxDate(),
      });
    } else {
      setFormData({
        scheduleId: "",
        validFrom: getToday(),
        validTo: getMaxDate(),
      });
    }
  };

  const assignScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const currentUser = employeeDetails;
      if (!currentUser?.employeeID) {
        throw new Error("Usuario no autenticado");
      }

      // Primero, si existe un horario anterior, lo actualizamos para que venza hoy
      if (existingEmployeeSchedule && existingEmployeeSchedule.empScheduleId) {
        const updatePreviousSchedulePayload = {
          validTo: getToday(), // El horario anterior vence hoy
          updatedBy: currentUser.employeeID,
          updatedAt: new Date().toISOString(),
        };

        console.log("Actualizando horario anterior:", updatePreviousSchedulePayload);
        const updateRes = await HorariosEmpleadosAPI.update(
          existingEmployeeSchedule.empScheduleId,
          updatePreviousSchedulePayload
        );

        if (updateRes.status === "error") {
          throw new Error(`Error al actualizar horario anterior: ${handleApiError(updateRes.error)}`);
        }
      }

      // Luego creamos el nuevo horario que empieza mañana (o hoy si no hay horario anterior)
      const payload = {
        employeeId: employee!.employeeID,
        scheduleId: parseInt(data.scheduleId),
        validFrom: data.validFrom,
        validTo: data.validTo || getMaxDate(),
        createdBy: currentUser.employeeID,
        createdAt: new Date().toISOString(),
        updatedBy: currentUser.employeeID,
        updatedAt: new Date().toISOString(),
      };

      console.log("Creando nuevo horario:", payload);
      const createRes = await HorariosEmpleadosAPI.create(payload);
      
      if (createRes.status === "error") {
        throw new Error(handleApiError(createRes.error));
      }
      return createRes.data;
    },
    onSuccess: () => {
      const message = existingEmployeeSchedule 
        ? "Horario actualizado exitosamente. El horario anterior ha sido vencido."
        : "Horario asignado exitosamente";
      
      toast({
        title: message,
        description: `El horario ha sido ${existingEmployeeSchedule ? 'actualizado' : 'asignado'} al empleado`,
      });
      
      // Invalidar las queries relevantes
      queryClient.invalidateQueries({ queryKey: ["employee-details"] });
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] });
      
      resetForm();
      onScheduleAssigned();
    },
    onError: (error: any) => {
      toast({
        title: `Error al ${existingEmployeeSchedule ? 'actualizar' : 'asignar'} horario`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !formData.scheduleId) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const selectedSchedule = schedules.find(s => s.scheduleId?.toString() === formData.scheduleId);
    if (!selectedSchedule) {
      toast({
        title: "Error",
        description: "Horario seleccionado no válido",
        variant: "destructive",
      });
      return;
    }

    // Validar que la fecha de inicio sea al menos mañana si hay horario existente
    if (existingEmployeeSchedule) {
      const tomorrow = getTomorrow();
      if (formData.validFrom < tomorrow) {
        toast({
          title: "Error",
          description: "Cuando se reemplaza un horario existente, la fecha de inicio debe ser al menos mañana",
          variant: "destructive",
        });
        return;
      }
    }

    assignScheduleMutation.mutate(formData);
  };

  const selectedSchedule = schedules.find(s => s.scheduleId?.toString() === formData.scheduleId);

  // Manejar cierre del diálogo
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const hasExistingSchedule = !!existingEmployeeSchedule;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {hasExistingSchedule ? "Reemplazar Horario" : "Asignar Horario"}
          </DialogTitle>
          <DialogDescription>
            {hasExistingSchedule 
              ? `Reemplace el horario actual de ${employee?.fullName}. El horario anterior vencerá hoy.`
              : `Asigne un horario a ${employee?.fullName}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del empleado */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Empleado</Label>
              <div className="text-sm text-gray-600 mt-1">{employee?.fullName}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Departamento</Label>
              <div className="text-sm text-gray-600 mt-1">{employee?.departmentName || "—"}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <div className="text-sm text-gray-600 mt-1">{employee?.email || "—"}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Tipo</Label>
              <div className="text-sm text-gray-600 mt-1">{employee?.employeeType || "—"}</div>
            </div>
          </div>

          {/* Información del horario actual (si existe) */}
          {hasExistingSchedule && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-sm mb-2 text-yellow-800">Horario Actual</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-yellow-600">Horario:</span>
                  <div className="font-medium">{existingEmployeeSchedule.schedule?.name || "—"}</div>
                </div>
                <div>
                  <span className="text-yellow-600">Horas:</span>
                  <div className="font-medium">
                    {fmtTime(existingEmployeeSchedule.schedule?.startTime)} - {fmtTime(existingEmployeeSchedule.schedule?.endTime)}
                  </div>
                </div>
                <div>
                  <span className="text-yellow-600">Válido desde:</span>
                  <div className="font-medium">{existingEmployeeSchedule.validFrom || "—"}</div>
                </div>
                <div>
                  <span className="text-yellow-600">Válido hasta:</span>
                  <div className="font-medium text-red-600">Hoy (se vencerá)</div>
                </div>
              </div>
            </div>
          )}

          {/* Selección de horario */}
          <div className="space-y-2">
            <Label htmlFor="scheduleId">
              {hasExistingSchedule ? "Nuevo Horario *" : "Horario *"}
            </Label>
            <Select 
              value={formData.scheduleId} 
              onValueChange={(value) => setFormData(f => ({ ...f, scheduleId: value }))}
              disabled={assignScheduleMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un horario" />
              </SelectTrigger>
              <SelectContent>
                {schedules
                  .filter(schedule => schedule.isActive !== false)
                  .map(schedule => (
                    <SelectItem key={schedule.scheduleId} value={schedule.scheduleId!.toString()}>
                      {schedule.name} ({fmtTime(schedule.startTime)} - {fmtTime(schedule.endTime)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detalles del horario seleccionado */}
          {selectedSchedule && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">
                {hasExistingSchedule ? "Detalles del Nuevo Horario:" : "Detalles del Horario:"}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Nombre:</span>
                  <div className="font-medium">{selectedSchedule.name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Horario:</span>
                  <div className="font-medium">
                    {fmtTime(selectedSchedule.startTime)} - {fmtTime(selectedSchedule.endTime)}
                  </div>
                </div>
                {selectedSchedule.description && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Descripción:</span>
                    <div className="font-medium">{selectedSchedule.description}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Válido Desde *</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData(f => ({ ...f, validFrom: e.target.value }))}
                required
                disabled={assignScheduleMutation.isPending}
                min={hasExistingSchedule ? getTomorrow() : getToday()}
              />
              {hasExistingSchedule && (
                <p className="text-xs text-gray-500">Mínimo: mañana (para reemplazar horario actual)</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Válido Hasta</Label>
              <Input
                id="validTo"
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData(f => ({ ...f, validTo: e.target.value }))}
                min={formData.validFrom}
                disabled={assignScheduleMutation.isPending}
              />
              <p className="text-xs text-gray-500">Deje en 31/12/9999 para horario permanente</p>
            </div>
          </div>

          {/* Resumen de cambios */}
          {hasExistingSchedule && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-sm mb-2 text-green-800">Resumen de Cambios</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• El horario actual vencerá hoy</li>
                <li>• El nuevo horario comenzará el {formData.validFrom}</li>
                <li>• El empleado tendrá un historial completo de horarios</li>
              </ul>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={assignScheduleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={assignScheduleMutation.isPending || !formData.scheduleId}
            >
              {assignScheduleMutation.isPending 
                ? hasExistingSchedule ? "Actualizando..." : "Asignando..." 
                : hasExistingSchedule ? "Reemplazar Horario" : "Asignar Horario"
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}