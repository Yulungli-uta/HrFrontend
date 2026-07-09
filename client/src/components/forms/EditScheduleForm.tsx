import { useState, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth";
import { HorariosEmpleadosAPI } from "@/lib/api";
import type { Employee, Schedule, EmployeeSchedule } from "@/types/schedule";
import { parseApiError } from "@/lib/error-handling";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";

interface EditScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  employeeSchedule: EmployeeSchedule | null;
  schedules: Schedule[];
  onScheduleUpdated: () => void;
}

const fmtDate = (s?: string) => (s ? s.substring(0, 10) : "");

export default function EditScheduleForm({
  open,
  onOpenChange,
  employee,
  employeeSchedule,
  schedules,
  onScheduleUpdated,
}: EditScheduleFormProps) {
  const { toast } = useToast();
  const { employeeDetails } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    scheduleId: "",
    validFrom: "",
    validTo: "",
  });

  const [isDirty, setIsDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const initialDataRef = useRef({ scheduleId: "", validFrom: "", validTo: "" });

  useEffect(() => {
    if (open && employeeSchedule) {
      const initial = {
        scheduleId: employeeSchedule.scheduleId?.toString() ?? "",
        validFrom: fmtDate(employeeSchedule.validFrom),
        validTo: fmtDate(employeeSchedule.validTo),
      };
      setFormData(initial);
      initialDataRef.current = initial;
      setIsDirty(false);
    }
  }, [open, employeeSchedule]);

  const checkDirty = (updated: typeof formData) => {
    const ref = initialDataRef.current;
    setIsDirty(
      updated.scheduleId !== ref.scheduleId ||
        updated.validFrom !== ref.validFrom ||
        updated.validTo !== ref.validTo
    );
  };

  const handleField = (field: keyof typeof formData, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    checkDirty(updated);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isDirty) {
      setConfirmOpen(true);
      return;
    }
    onOpenChange(next);
  };

  const closeClean = () => {
    setIsDirty(false);
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!employeeSchedule?.empScheduleId) {
        throw new Error("No se encontró el ID de la asignación de horario");
      }
      const currentUser = employeeDetails;
      if (!currentUser?.employeeID) {
        throw new Error("Usuario no autenticado");
      }

      const payload = {
        scheduleId: parseInt(data.scheduleId),
        validFrom: data.validFrom,
        validTo: data.validTo || "9999-12-31",
        updatedBy: currentUser.employeeID,
        updatedAt: new Date().toISOString(),
      };

      const res = await HorariosEmpleadosAPI.update(
        employeeSchedule.empScheduleId,
        payload
      );
      if (res.status === "error") {
        throw new Error(parseApiError(res.error).message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Horario actualizado",
        description: "La asignación de horario fue modificada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["employee-details"] });
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] });
      setIsDirty(false);
      onScheduleUpdated();
    },
    onError: (error: unknown) => {
      toast({
        title: "Error al actualizar horario",
        description: parseApiError(error).message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !formData.scheduleId) {
      toast({
        title: "Campos requeridos",
        description: "Seleccione un horario antes de guardar.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(formData);
  };

  const activeSchedules = schedules.filter((s) => s.isActive !== false);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar asignación de horario</DialogTitle>
            <DialogDescription>
              {employee?.fullName
                ? `Modifique los datos de la asignación de horario para ${employee.fullName}.`
                : "Modifique los datos de la asignación de horario."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-scheduleId">
                Horario <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.scheduleId}
                onValueChange={(v) => handleField("scheduleId", v)}
              >
                <SelectTrigger id="edit-scheduleId">
                  <SelectValue placeholder="Seleccione un horario" />
                </SelectTrigger>
                <SelectContent>
                  {activeSchedules.map((s) => (
                    <SelectItem
                      key={s.scheduleId}
                      value={s.scheduleId!.toString()}
                    >
                      {s.name}
                      {s.startTime && s.endTime
                        ? ` (${s.startTime.substring(0, 5)} – ${s.endTime.substring(0, 5)})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-validFrom">
                Vigente desde <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => handleField("validFrom", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-validTo">Vigente hasta</Label>
              <Input
                id="edit-validTo"
                type="date"
                value={formData.validTo === "9999-12-31" ? "" : formData.validTo}
                onChange={(e) =>
                  handleField("validTo", e.target.value || "9999-12-31")
                }
                placeholder="Sin fecha de fin (indefinido)"
              />
              <p className="text-xs text-muted-foreground">
                Dejar vacío para asignación indefinida.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirmExit={closeClean}
      />
    </>
  );
}
