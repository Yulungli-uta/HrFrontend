// src/components/schedules/AssignScheduleForm.tsx
import { useState } from "react";
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
import { HorariosEmpleadosAPI, handleApiError, type ApiResponse } from "@/lib/api";
import type { Employee, Schedule } from "@/types/schedule";

interface AssignScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  schedules: Schedule[];
  onScheduleAssigned: () => void;
}

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
  if (s.includes(':')) {
    return s.substring(0, 5);
  }
  return s;
};

export default function AssignScheduleForm({
  open,
  onOpenChange,
  employee,
  schedules,
  onScheduleAssigned,
}: AssignScheduleFormProps) {
  const { toast } = useToast();
  const { employeeDetails } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    scheduleId: "",
    validFrom: new Date().toISOString().split('T')[0],
    validTo: "9999-12-31",
  });

  const resetForm = () => {
    setFormData({
      scheduleId: "",
      validFrom: new Date().toISOString().split('T')[0],
      validTo: "9999-12-31",
    });
  };

  const assignScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const currentUser = employeeDetails;
      if (!currentUser?.employeeID) {
        throw new Error("Usuario no autenticado");
      }

      const payload = {
        employeeId: employee!.employeeID,
        scheduleId: parseInt(data.scheduleId),
        validFrom: data.validFrom,
        validTo: data.validTo || "9999-12-31",
        createdBy: currentUser.employeeID,
        createdAt: new Date().toISOString(),
        updatedBy: currentUser.employeeID,
        updatedAt: new Date().toISOString(),
      };

      console.log("Creando nuevo horario:", payload);
      const res = await HorariosEmpleadosAPI.create(payload);
      if (res.status === "error") {
        throw new Error(handleApiError(res.error));
      }
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Horario asignado exitosamente",
        description: "El horario ha sido asignado al empleado",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/rh/employee-schedules"] });
      resetForm();
      onScheduleAssigned();
    },
    onError: (error: any) => {
      toast({
        title: "Error al asignar horario",
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

    assignScheduleMutation.mutate(formData);
  };

  const selectedSchedule = schedules.find(s => s.scheduleId?.toString() === formData.scheduleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Asignar Horario</DialogTitle>
          <DialogDescription>
            Asigne un horario a {employee?.fullName}
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

          {/* Selección de horario */}
          <div className="space-y-2">
            <Label htmlFor="scheduleId">Horario *</Label>
            <Select 
              value={formData.scheduleId} 
              onValueChange={(value) => setFormData(f => ({ ...f, scheduleId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un horario" />
              </SelectTrigger>
              <SelectContent>
                {schedules
                  .filter(schedule => schedule.isActive)
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
              <h4 className="font-medium text-sm mb-2">Detalles del Horario:</h4>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Válido Hasta</Label>
              <Input
                id="validTo"
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData(f => ({ ...f, validTo: e.target.value }))}
                min={formData.validFrom}
              />
              <p className="text-xs text-gray-500">Deje en 31/12/9999 para horario permanente</p>
            </div>
          </div>

          {/* Campos de auditoría (solo lectura) */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-xs text-gray-500">Creado Por</Label>
              <div className="text-sm">{employeeDetails?.fullName || "—"}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Fecha de Creación</Label>
              <div className="text-sm">{new Date().toLocaleDateString('es-ES')}</div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={assignScheduleMutation.isPending}
            >
              {assignScheduleMutation.isPending ? "Asignando..." : "Asignar Horario"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}