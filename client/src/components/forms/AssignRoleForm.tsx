import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RolesAPI, UserRolesAPI, type ApiResponse } from "@/lib/api";
import type { Role, CreateUserRoleDto } from "@/types/auth";

interface AssignRoleFormProps {
  userId: string;
  userEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  roleId: string;
  expiresAt: string;
  reason: string;
}

export default function AssignRoleForm({
  userId,
  userEmail,
  onSuccess,
  onCancel,
}: AssignRoleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      roleId: "",
      expiresAt: "",
      reason: "",
    },
  });

  const roleId = watch("roleId");

  // Obtener lista de roles
  const { data: rolesResponse, isLoading: rolesLoading } = useQuery<
    ApiResponse<Role[]>
  >({
    queryKey: ["roles"],
    queryFn: () => RolesAPI.list(),
  });

  const roles = rolesResponse?.status === "success" ? rolesResponse.data : [];
  const activeRoles = roles.filter((r) => r.isActive && !r.isDeleted);

  // Mutación para asignar rol
  const assignMutation = useMutation({
    mutationFn: (data: CreateUserRoleDto) => UserRolesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({
        title: "Rol asignado",
        description: "El rol ha sido asignado al usuario exitosamente",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error al asignar rol",
        description: error.message || "No se pudo asignar el rol",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const assignData: CreateUserRoleDto = {
      userId,
      roleId: parseInt(data.roleId),
      expiresAt: data.expiresAt || undefined,
      reason: data.reason || undefined,
    };
    assignMutation.mutate(assignData);
  };

  const isLoading = assignMutation.isPending || rolesLoading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Asignar Rol a Usuario</h2>

        {/* Información del usuario */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>Usuario:</strong> {userEmail}
          </p>
        </div>

        {/* Selección de rol */}
        <div className="space-y-2">
          <Label htmlFor="roleId">
            Rol <span className="text-red-500">*</span>
          </Label>
          <Select
            value={roleId}
            onValueChange={(value) => setValue("roleId", value)}
            disabled={rolesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un rol" />
            </SelectTrigger>
            <SelectContent>
              {activeRoles.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">
                  No hay roles disponibles
                </div>
              ) : (
                activeRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name} {role.description && `- ${role.description}`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.roleId && (
            <p className="text-sm text-red-600">{errors.roleId.message}</p>
          )}
        </div>

        {/* Fecha de expiración (opcional) */}
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Fecha de Expiración (Opcional)</Label>
          <Input
            id="expiresAt"
            type="date"
            {...register("expiresAt")}
            min={new Date().toISOString().split("T")[0]}
          />
          <p className="text-sm text-gray-500">
            Si no se especifica, el rol no expirará
          </p>
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

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> El usuario puede tener múltiples roles
            simultáneamente. Los permisos se acumulan de todos los roles
            asignados.
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !roleId}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Asignando..." : "Asignar Rol"}
        </Button>
      </div>
    </form>
  );
}
