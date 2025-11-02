import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RolesAPI } from "@/lib/api";
import type { Role, CreateRoleDto, UpdateRoleDto } from "@/types/auth";

interface RoleFormProps {
  role?: Role | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
}

export default function RoleForm({ role, onSuccess, onCancel }: RoleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!role;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      priority: role?.priority || 100,
      isActive: role?.isActive ?? true,
    },
  });

  // Mutación para crear rol
  const createMutation = useMutation({
    mutationFn: (data: CreateRoleDto) => RolesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Rol creado",
        description: "El rol ha sido creado exitosamente",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear rol",
        description: error.message || "No se pudo crear el rol",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar rol
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleDto }) =>
      RolesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Rol actualizado",
        description: "El rol ha sido actualizado exitosamente",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar rol",
        description: error.message || "No se pudo actualizar el rol",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing && role) {
      const updateData: UpdateRoleDto = {
        description: data.description || undefined,
        priority: data.priority,
        isActive: data.isActive,
      };
      updateMutation.mutate({ id: role.id, data: updateData });
    } else {
      const createData: CreateRoleDto = {
        name: data.name,
        description: data.description || undefined,
        priority: data.priority,
      };
      createMutation.mutate(createData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          {isEditing ? "Editar Rol" : "Nuevo Rol"}
        </h2>

        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nombre <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register("name", {
              required: "El nombre es requerido",
              minLength: {
                value: 3,
                message: "El nombre debe tener al menos 3 caracteres",
              },
            })}
            disabled={isEditing}
            placeholder="Administrador, Usuario, etc."
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
          {isEditing && (
            <p className="text-sm text-gray-500">
              El nombre del rol no puede ser modificado
            </p>
          )}
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Descripción del rol y sus responsabilidades"
            rows={3}
          />
        </div>

        {/* Prioridad */}
        <div className="space-y-2">
          <Label htmlFor="priority">
            Prioridad <span className="text-red-500">*</span>
          </Label>
          <Input
            id="priority"
            type="number"
            {...register("priority", {
              required: "La prioridad es requerida",
              min: {
                value: 1,
                message: "La prioridad debe ser mayor a 0",
              },
              valueAsNumber: true,
            })}
            placeholder="100"
          />
          {errors.priority && (
            <p className="text-sm text-red-600">{errors.priority.message}</p>
          )}
          <p className="text-sm text-gray-500">
            Los roles con menor número tienen mayor prioridad (1 es la más alta)
          </p>
        </div>

        {/* Estado activo (solo en edición) */}
        {isEditing && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Rol activo
            </Label>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los roles se utilizan para agrupar permisos y
            asignarlos a usuarios. Un usuario puede tener múltiples roles
            simultáneamente.
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
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading
            ? "Guardando..."
            : isEditing
            ? "Actualizar Rol"
            : "Crear Rol"}
        </Button>
      </div>
    </form>
  );
}
