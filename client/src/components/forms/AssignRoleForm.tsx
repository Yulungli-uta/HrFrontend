import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RoleCombobox } from "@/components/ui/RoleCombobox";
import { useToast } from "@/hooks/use-toast";
import { UserRolesAPI } from "@/lib/api";
import type { CreateUserRoleDto } from "@/features/auth";
import { todayEcuador } from "@/lib/clock";

interface AssignRoleFormProps {
  userId: string;
  userEmail: string;
  assignedRoleIds?: number[];
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface FormData {
  roleId: string;
  expiresAt: string;
  reason: string;
}

export default function AssignRoleForm({
  userId,
  userEmail,
  assignedRoleIds = [],
  onSuccess,
  onCancel,
  onDirtyChange,
}: AssignRoleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: _formIsDirty },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      roleId: "",
      expiresAt: "",
      reason: "",
    },
  });

  const _onDirtyChangeRef = useRef(onDirtyChange);
  _onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    _onDirtyChangeRef.current?.(_formIsDirty);
  }, [_formIsDirty]);

  const roleId = watch("roleId");

  // El selector de roles (RoleCombobox) busca y pagina en el servidor; aquí solo se indican los roles ya asignados.
  const assignedIdsSet = useMemo(() => new Set(assignedRoleIds), [assignedRoleIds]);

  // Mutación (usa assign, no create)
  const assignMutation = useMutation({
    mutationFn: async (data: CreateUserRoleDto) => {
      const res = await UserRolesAPI.assign(data);
      if (res.status !== "success") {
        throw new Error(res.error?.message || "No se pudo asignar el rol.");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({ title: "Rol asignado", description: "El rol se asignó correctamente." });
      onSuccess();
    },
    onError: (error: unknown) => {
      toast({
        title: "Error al asignar rol",
        description: error instanceof Error ? error.message : "No se pudo asignar el rol.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: CreateUserRoleDto = {
      userId,
      roleId: parseInt(data.roleId, 10),
      expiresAt: data.expiresAt || undefined,
      reason: data.reason || undefined,
    };
    assignMutation.mutate(payload);
  };

  const isLoading = assignMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Asignar Rol a Usuario</h2>

        {/* Selección de rol */}
        <div className="space-y-2">
          <Label htmlFor="roleId">
            Rol <span className="text-destructive">*</span>
          </Label>
          <RoleCombobox
            value={roleId}
            excludeRoleIds={assignedRoleIds}
            onChange={(value) => setValue("roleId", value, { shouldValidate: true })}
          />
          {errors.roleId && (
            <p className="text-sm text-destructive">{errors.roleId.message}</p>
          )}
        </div>

        {/* Fecha de expiración (opcional) */}
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Fecha de Expiración (Opcional)</Label>
          <Input
            id="expiresAt"
            type="date"
            {...register("expiresAt")}
            min={todayEcuador()}
          />
          <p className="text-sm text-muted-foreground">Si no se especifica, el rol no expirará.</p>
        </div>

        {/* Razón (opcional) */}
        <div className="space-y-2">
          <Label htmlFor="reason">Razón de Asignación (Opcional)</Label>
          <Textarea
            id="reason"
            {...register("reason")}
            placeholder="Motivo por el cual se asigna este rol al usuario"
            rows={3}
          />
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <p className="text-sm text-primary">
            <strong>Nota:</strong> El usuario puede tener múltiples roles simultáneamente. Los
            permisos se acumulan.
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !roleId} className="bg-primary hover:bg-primary/90">
          {isLoading ? "Asignando..." : "Asignar Rol"}
        </Button>
      </div>
    </form>
  );
}
